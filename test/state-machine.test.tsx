/**
 * State Machine and Backend Tests
 *
 * Tests for:
 * - InMemoryBackend
 * - StateMachine lifecycle
 * - Dependency graph and topological sort
 * - Deployment ordering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StateMachine,
  buildDependencyGraph,
  topologicalSort,
  computeParallelBatches,
  resetRuntime,
  useInstance,
  runWithBackend,
  type InstanceNode,
} from '../src/index.js';
import { InMemoryBackend } from './utils/in-memory-backend.js';
import { MockProvider } from './utils/mock-provider.js';

// Construct classes
class VPC {}
class Subnet {}
class Database {}
class Cache {}

describe('InMemoryBackend', () => {
  let backend: InMemoryBackend;

  beforeEach(() => {
    backend = new InMemoryBackend();
  });

  it('returns null for non-existent stack', async () => {
    const state = await backend.getState('non-existent');
    expect(state).toBeNull();
  });

  it('saves and retrieves state', async () => {
    const state = {
      nodes: [],
      status: 'deployed' as const,
      stackName: 'test-stack',
      lastDeployedAt: Date.now(),
    };

    await backend.saveState('test-stack', state);
    const retrieved = await backend.getState('test-stack');

    expect(retrieved).toEqual(state);
  });

  it('returns deep clone of state', async () => {
    const state = {
      nodes: [{ id: 'test' }],
      status: 'deployed' as const,
      stackName: 'test-stack',
      lastDeployedAt: Date.now(),
    };

    await backend.saveState('test-stack', state as any);
    const retrieved = await backend.getState('test-stack');

    // Modify retrieved state
    retrieved!.nodes.push({ id: 'modified' } as any);

    // Original should be unchanged
    const retrievedAgain = await backend.getState('test-stack');
    expect(retrievedAgain!.nodes).toHaveLength(1);
  });

  describe('Locking', () => {
    it('acquires lock successfully', async () => {
      const acquired = await backend.acquireLock('test-stack', 'holder-1', 60);
      expect(acquired).toBe(true);
    });

    it('prevents concurrent lock acquisition', async () => {
      await backend.acquireLock('test-stack', 'holder-1', 60);
      const acquired = await backend.acquireLock('test-stack', 'holder-2', 60);
      expect(acquired).toBe(false);
    });

    it('allows same holder to renew lock', async () => {
      await backend.acquireLock('test-stack', 'holder-1', 60);
      const acquired = await backend.acquireLock('test-stack', 'holder-1', 60);
      expect(acquired).toBe(true);
    });

    it('releases lock', async () => {
      await backend.acquireLock('test-stack', 'holder-1', 60);
      await backend.releaseLock('test-stack');
      const acquired = await backend.acquireLock('test-stack', 'holder-2', 60);
      expect(acquired).toBe(true);
    });
  });

  describe('Audit Log', () => {
    it('appends and retrieves audit entries', async () => {
      await backend.appendAuditLog('test-stack', {
        timestamp: 1000,
        action: 'deploy_start',
      });
      await backend.appendAuditLog('test-stack', {
        timestamp: 2000,
        action: 'deploy_complete',
      });

      const logs = await backend.getAuditLog('test-stack');
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('deploy_start');
      expect(logs[1].action).toBe('deploy_complete');
    });

    it('limits returned entries', async () => {
      for (let i = 0; i < 10; i++) {
        await backend.appendAuditLog('test-stack', {
          timestamp: i * 1000,
          action: 'resource_applied',
        });
      }

      const logs = await backend.getAuditLog('test-stack', 3);
      expect(logs).toHaveLength(3);
      // Should return last 3
      expect(logs[0].timestamp).toBe(7000);
    });
  });
});

describe('StateMachine', () => {
  let backend: InMemoryBackend;
  let stateMachine: StateMachine;

  beforeEach(() => {
    backend = new InMemoryBackend();
    stateMachine = new StateMachine(backend);
  });

  it('tracks resource states', () => {
    expect(stateMachine.getResourceState('node-1')).toBe('pending');

    stateMachine.setResourceState('node-1', 'applying');
    expect(stateMachine.getResourceState('node-1')).toBe('applying');

    stateMachine.setResourceState('node-1', 'deployed');
    expect(stateMachine.getResourceState('node-1')).toBe('deployed');
  });

  it('restores resource states from nodes', () => {
    const nodes = [
      { id: 'node-1', outputs: { url: 'http://...' } },
      { id: 'node-2' }, // No outputs = pending
    ];

    stateMachine.restoreResourceStates(nodes as any);

    expect(stateMachine.getResourceState('node-1')).toBe('deployed');
    expect(stateMachine.getResourceState('node-2')).toBe('pending');
  });

  it('starts and completes deployment', async () => {
    const changeSet = {
      creates: [],
      updates: [],
      deletes: [],
      deploymentOrder: [],
      parallelBatches: [],
    };

    await stateMachine.startDeployment('test-stack', changeSet, []);

    let state = await backend.getState('test-stack');
    expect(state?.status).toBe('applying');
    expect(state?.changeSet).toEqual(changeSet);

    await stateMachine.completeDeployment('test-stack', []);

    state = await backend.getState('test-stack');
    expect(state?.status).toBe('deployed');
    expect(state?.changeSet).toBeUndefined();
  });

  it('tracks checkpoint for crash recovery', async () => {
    const changeSet = {
      creates: [],
      updates: [],
      deletes: [],
      deploymentOrder: ['a', 'b', 'c'],
      parallelBatches: [],
    };

    await stateMachine.startDeployment('test-stack', changeSet, []);
    await stateMachine.updateCheckpoint('test-stack', 1);

    const state = await backend.getState('test-stack');
    expect(state?.checkpoint).toBe(1);
  });

  it('detects resumable deployment', async () => {
    const changeSet = {
      creates: [],
      updates: [],
      deletes: [],
      deploymentOrder: ['a', 'b', 'c'],
      parallelBatches: [],
    };

    await stateMachine.startDeployment('test-stack', changeSet, []);
    await stateMachine.updateCheckpoint('test-stack', 1);

    expect(await stateMachine.canResume('test-stack')).toBe(true);

    const resumePoint = await stateMachine.getResumePoint('test-stack');
    expect(resumePoint?.checkpoint).toBe(1);
    expect(resumePoint?.changeSet.deploymentOrder).toEqual(['a', 'b', 'c']);
  });

  it('records failed deployment', async () => {
    const changeSet = {
      creates: [],
      updates: [],
      deletes: [],
      deploymentOrder: [],
      parallelBatches: [],
    };

    await stateMachine.startDeployment('test-stack', changeSet, []);
    await stateMachine.failDeployment('test-stack', new Error('Something broke'));

    const state = await backend.getState('test-stack');
    expect(state?.status).toBe('failed');
  });
});

describe('Dependency Graph', () => {
  // Create mock nodes with paths
  function createNode(path: string[]): InstanceNode {
    return {
      id: path.join('.'),
      path,
      construct: class {},
      constructType: path[path.length - 1],
      props: {},
      outputSignals: new Map(),
      children: [],
    };
  }

  it('builds dependency graph from paths', () => {
    const nodes = [
      createNode(['App']),
      createNode(['App', 'VPC']),
      createNode(['App', 'VPC', 'Database']),
      createNode(['App', 'API']),
    ];

    const graph = buildDependencyGraph(nodes);

    // App has no dependencies
    expect(graph.dependencies.get('App')).toEqual([]);

    // VPC depends on App
    expect(graph.dependencies.get('App.VPC')).toEqual(['App']);

    // Database depends on VPC
    expect(graph.dependencies.get('App.VPC.Database')).toEqual(['App.VPC']);

    // API depends on App
    expect(graph.dependencies.get('App.API')).toEqual(['App']);

    // Check dependents
    expect(graph.dependents.get('App')).toContain('App.VPC');
    expect(graph.dependents.get('App')).toContain('App.API');
    expect(graph.dependents.get('App.VPC')).toContain('App.VPC.Database');
  });

  it('performs topological sort', () => {
    const nodes = [
      createNode(['App']),
      createNode(['App', 'VPC']),
      createNode(['App', 'VPC', 'Database']),
    ];

    const graph = buildDependencyGraph(nodes);
    const order = topologicalSort(
      nodes.map((n) => n.id),
      graph
    );

    // App must come before VPC, VPC must come before Database
    expect(order.indexOf('App')).toBeLessThan(order.indexOf('App.VPC'));
    expect(order.indexOf('App.VPC')).toBeLessThan(order.indexOf('App.VPC.Database'));
  });

  it('computes parallel batches', () => {
    const nodes = [
      createNode(['App']),
      createNode(['App', 'VPC']),
      createNode(['App', 'API']),
      createNode(['App', 'VPC', 'Database']),
    ];

    const graph = buildDependencyGraph(nodes);
    const order = topologicalSort(
      nodes.map((n) => n.id),
      graph
    );
    const batches = computeParallelBatches(order, graph);

    // Batch 0: App (no deps)
    expect(batches[0]).toContain('App');

    // Batch 1: VPC and API (both only depend on App)
    expect(batches[1]).toContain('App.VPC');
    expect(batches[1]).toContain('App.API');

    // Batch 2: Database (depends on VPC)
    expect(batches[2]).toContain('App.VPC.Database');
  });
});

describe('Integration: State Machine with Runtime', () => {
  let backend: InMemoryBackend;
  let provider: MockProvider;

  beforeEach(() => {
    resetRuntime();
    backend = new InMemoryBackend();
    provider = new MockProvider();
  });

  it('persists state to backend after deployment', async () => {
    provider.setOutputs('Database', { url: 'postgres://localhost' });

    function App() {
      useInstance(Database, { name: 'main' });
      return null;
    }

    await runWithBackend(<App />, provider, backend, 'test-stack');

    const state = await backend.getState('test-stack');
    expect(state).not.toBeNull();
    expect(state!.status).toBe('deployed');
    expect(state!.nodes).toHaveLength(1);
    expect(state!.nodes[0].constructType).toBe('Database');
  });

  it('restores state from backend on subsequent runs', async () => {
    provider.setOutputs('Database', { url: 'postgres://localhost' });

    function App() {
      useInstance(Database, { name: 'main' });
      return null;
    }

    // First run
    await runWithBackend(<App />, provider, backend, 'test-stack');
    expect(provider.applyCalls).toHaveLength(1);

    // Reset provider but not backend
    provider.reset();
    resetRuntime();

    // Second run - should detect no changes
    await runWithBackend(<App />, provider, backend, 'test-stack');

    // No new applies since nothing changed
    expect(provider.applyCalls).toHaveLength(0);
  });
});
