// REQ-O01: StateMachine unit tests
// Tests for deployment lifecycle, crash recovery, and state transitions

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StateMachine,
  DeploymentState,
  DeploymentStatus,
  StateMachineEvent,
  AuditLogEntry
} from '../../src/core/StateMachine';
import { DeploymentError } from '../../src/core/errors';
import { ChangeSet, CloudDOMNode } from '../../src/core/types';
import { IBackendProvider } from '../../src/providers/IBackendProvider';

/**
 * Mock BackendProvider with locking and audit support
 */
class MockBackendProvider implements IBackendProvider<DeploymentState> {
  private states = new Map<string, DeploymentState>();
  private locks = new Map<string, { holder: string; acquiredAt: number; ttl: number }>();
  private auditLogs = new Map<string, AuditLogEntry[]>();
  private snapshots = new Map<string, DeploymentState[]>();

  async initialize(): Promise<void> { }

  async getState(stackName: string): Promise<DeploymentState | undefined> {
    return this.states.get(stackName);
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    this.states.set(stackName, state);
  }

  async acquireLock(stackName: string, holder: string, ttl: number): Promise<void> {
    const existingLock = this.locks.get(stackName);

    if (existingLock) {
      const now = Date.now();
      if (now - existingLock.acquiredAt < existingLock.ttl * 1000) {
        throw new Error(
          `Stack "${stackName}" is locked by ${existingLock.holder}`
        );
      }
    }

    this.locks.set(stackName, { holder, acquiredAt: Date.now(), ttl });
  }

  async releaseLock(stackName: string): Promise<void> {
    this.locks.delete(stackName);
  }

  async checkLock(stackName: string): Promise<{ holder: string; acquiredAt: number; ttl: number } | null> {
    return this.locks.get(stackName) || null;
  }

  async appendAuditLog(stackName: string, entry: AuditLogEntry): Promise<void> {
    if (!this.auditLogs.has(stackName)) {
      this.auditLogs.set(stackName, []);
    }
    this.auditLogs.get(stackName)!.push(entry);
  }

  async saveSnapshot(stackName: string, state: DeploymentState): Promise<void> {
    if (!this.snapshots.has(stackName)) {
      this.snapshots.set(stackName, []);
    }
    this.snapshots.get(stackName)!.push(state);
  }

  // Test helpers
  getAuditLogs(stackName: string): AuditLogEntry[] {
    return this.auditLogs.get(stackName) || [];
  }

  getSnapshots(stackName: string): DeploymentState[] {
    return this.snapshots.get(stackName) || [];
  }

  hasLock(stackName: string): boolean {
    return this.locks.has(stackName);
  }
}

/**
 * Create mock CloudDOM nodes for testing
 */
function createMockCloudDOM(): CloudDOMNode[] {
  return [
    {
      id: 'node1',
      path: ['node1'],
      construct: { name: 'TestConstruct' },
      props: { name: 'test1' },
      children: [],
    },
    {
      id: 'node2',
      path: ['node2'],
      construct: { name: 'TestConstruct' },
      props: { name: 'test2' },
      children: [],
    },
  ];
}

/**
 * Create mock ChangeSet for testing
 */
function createMockChangeSet(): ChangeSet {
  return {
    creates: [],
    updates: [],
    deletes: [],
    replacements: [],
    moves: [],
    deploymentOrder: ['node1', 'node2'],
    parallelBatches: [['node1'], ['node2']],
  };
}

describe('StateMachine', () => {
  let backendProvider: MockBackendProvider;
  let stateMachine: StateMachine;
  const stackName = 'test-stack';
  const user = 'test-user@example.com';

  beforeEach(() => {
    backendProvider = new MockBackendProvider();
    stateMachine = new StateMachine(backendProvider);
  });

  describe('startDeployment', () => {
    it('should transition state to APPLYING', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      const state = await stateMachine.getState(stackName);
      expect(state).toBeDefined();
      expect(state!.status).toBe('APPLYING');
      expect(state!.user).toBe(user);
      expect(state!.stackName).toBe(stackName);
      expect(state!.changeSet).toEqual(changeSet);
      expect(state!.cloudDOM).toEqual(cloudDOM);
    });

    it('should acquire lock before starting deployment', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      expect(backendProvider.hasLock(stackName)).toBe(true);
    });

    it('should fail if lock cannot be acquired', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      // Acquire lock first
      await backendProvider.acquireLock(stackName, 'other-user', 600);

      // Try to start deployment
      await expect(
        stateMachine.startDeployment(stackName, changeSet, cloudDOM, user)
      ).rejects.toThrow(DeploymentError);
    });

    it('should emit started event', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();
      const handler = vi.fn();

      stateMachine.on('started', handler);

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'started',
          state: expect.objectContaining({
            status: 'APPLYING',
            user,
            stackName,
          }),
          metadata: expect.any(Object),
        })
      );
    });

    it('should append audit log entry', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      const auditLogs = backendProvider.getAuditLogs(stackName);
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        action: 'start',
        user,
        stackName,
        status: 'completed',
      });
    });
  });

  describe('updateCheckpoint', () => {
    beforeEach(async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();
      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
    });

    it('should update checkpoint index', async () => {
      await stateMachine.updateCheckpoint(stackName, 0);

      const state = await stateMachine.getState(stackName);
      expect(state!.checkpoint).toBe(0);
    });

    it('should emit checkpoint event', async () => {
      const handler = vi.fn();
      stateMachine.on('checkpoint', handler);

      await stateMachine.updateCheckpoint(stackName, 0);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'checkpoint',
          state: expect.objectContaining({
            checkpoint: 0,
          }),
        })
      );
    });

    it('should fail if state is not APPLYING', async () => {
      await stateMachine.completeDeployment(stackName);

      await expect(
        stateMachine.updateCheckpoint(stackName, 1)
      ).rejects.toThrow(DeploymentError);
    });

    it('should append audit log entry', async () => {
      await stateMachine.updateCheckpoint(stackName, 0);

      const auditLogs = backendProvider.getAuditLogs(stackName);
      expect(auditLogs.length).toBeGreaterThan(1);
      expect(auditLogs[auditLogs.length - 1]).toMatchObject({
        action: 'checkpoint',
        checkpoint: 0,
      });
    });
  });

  describe('completeDeployment', () => {
    beforeEach(async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();
      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
    });

    it('should transition state to DEPLOYED', async () => {
      await stateMachine.completeDeployment(stackName);

      const state = await stateMachine.getState(stackName);
      expect(state!.status).toBe('DEPLOYED');
    });

    it('should clear checkpoint and changeSet', async () => {
      await stateMachine.updateCheckpoint(stackName, 0);
      await stateMachine.completeDeployment(stackName);

      const state = await stateMachine.getState(stackName);
      expect(state!.checkpoint).toBeUndefined();
      expect(state!.changeSet).toBeUndefined();
    });

    it('should release lock', async () => {
      await stateMachine.completeDeployment(stackName);

      expect(backendProvider.hasLock(stackName)).toBe(false);
    });

    it('should emit completed event', async () => {
      const handler = vi.fn();
      stateMachine.on('completed', handler);

      await stateMachine.completeDeployment(stackName);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should fail if state is not APPLYING', async () => {
      await stateMachine.completeDeployment(stackName);

      await expect(
        stateMachine.completeDeployment(stackName)
      ).rejects.toThrow(DeploymentError);
    });
  });

  describe('failDeployment', () => {
    beforeEach(async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();
      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
    });

    it('should transition state to FAILED', async () => {
      const error = new Error('Test error');

      await stateMachine.failDeployment(stackName, error);

      const state = await stateMachine.getState(stackName);
      expect(state!.status).toBe('FAILED');
      expect(state!.error).toMatchObject({
        message: 'Test error',
      });
    });

    it('should release lock', async () => {
      const error = new Error('Test error');

      await stateMachine.failDeployment(stackName, error);

      expect(backendProvider.hasLock(stackName)).toBe(false);
    });

    it('should emit failed event', async () => {
      const handler = vi.fn();
      stateMachine.on('failed', handler);

      const error = new Error('Test error');
      await stateMachine.failDeployment(stackName, error);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should append audit log entry with error', async () => {
      const error = new Error('Test error');

      await stateMachine.failDeployment(stackName, error);

      const auditLogs = backendProvider.getAuditLogs(stackName);
      const failLog = auditLogs.find(log => log.action === 'fail');
      expect(failLog).toBeDefined();
      expect(failLog!.status).toBe('failed');
      expect(failLog!.error).toBe('Test error');
    });
  });

  describe('resumeDeployment', () => {
    it('should return changeSet and checkpoint', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
      await stateMachine.updateCheckpoint(stackName, 0);

      // Mock checkLock to return null (no lock held)
      vi.spyOn(backendProvider, 'checkLock').mockResolvedValue(null);

      const result = await stateMachine.resumeDeployment(stackName);

      expect(result.changeSet).toEqual(changeSet);
      expect(result.checkpoint).toBe(0);
      expect(result.cloudDOM).toEqual(cloudDOM);
    });

    it('should fail if state is not APPLYING', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
      await stateMachine.completeDeployment(stackName);

      await expect(
        stateMachine.resumeDeployment(stackName)
      ).rejects.toThrow(DeploymentError);
    });

    it('should return -1 checkpoint if no checkpoint set', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      // Mock checkLock to return null (no lock held)
      vi.spyOn(backendProvider, 'checkLock').mockResolvedValue(null);

      const result = await stateMachine.resumeDeployment(stackName);

      expect(result.checkpoint).toBe(-1);
    });
  });

  describe('rollback', () => {
    beforeEach(async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();
      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
    });

    it('should transition state to ROLLED_BACK', async () => {
      await stateMachine.rollback(stackName);

      const state = await stateMachine.getState(stackName);
      expect(state!.status).toBe('ROLLED_BACK');
    });

    it('should clear checkpoint and changeSet', async () => {
      await stateMachine.updateCheckpoint(stackName, 0);
      await stateMachine.rollback(stackName);

      const state = await stateMachine.getState(stackName);
      expect(state!.checkpoint).toBeUndefined();
      expect(state!.changeSet).toBeUndefined();
    });

    it('should release lock', async () => {
      await stateMachine.rollback(stackName);

      expect(backendProvider.hasLock(stackName)).toBe(false);
    });

    it('should emit rolled_back event', async () => {
      const handler = vi.fn();
      stateMachine.on('rolled_back', handler);

      await stateMachine.rollback(stackName);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should work from FAILED state', async () => {
      const error = new Error('Test error');
      await stateMachine.failDeployment(stackName, error);

      await stateMachine.rollback(stackName);

      const state = await stateMachine.getState(stackName);
      expect(state!.status).toBe('ROLLED_BACK');
    });
  });

  describe('hasIncompleteDeployment', () => {
    it('should return true for APPLYING state', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      const hasIncomplete = await stateMachine.hasIncompleteDeployment(stackName);
      expect(hasIncomplete).toBe(true);
    });

    it('should return false for DEPLOYED state', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
      await stateMachine.completeDeployment(stackName);

      const hasIncomplete = await stateMachine.hasIncompleteDeployment(stackName);
      expect(hasIncomplete).toBe(false);
    });

    it('should return false for non-existent stack', async () => {
      const hasIncomplete = await stateMachine.hasIncompleteDeployment('non-existent');
      expect(hasIncomplete).toBe(false);
    });
  });

  describe('getCheckpointInfo', () => {
    it('should return checkpoint info with resource ID', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
      await stateMachine.updateCheckpoint(stackName, 0);

      const info = await stateMachine.getCheckpointInfo(stackName);

      expect(info).toBeDefined();
      expect(info!.checkpoint).toBe(0);
      expect(info!.resourceId).toBe('node1');
      expect(info!.totalResources).toBe(2);
      expect(info!.percentComplete).toBe(50);
    });

    it('should return undefined for non-existent stack', async () => {
      const info = await stateMachine.getCheckpointInfo('non-existent');
      expect(info).toBeUndefined();
    });
  });

  describe('autoRecover', () => {
    it('should resume deployment when strategy is resume', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);
      await stateMachine.updateCheckpoint(stackName, 0);

      // Mock checkLock to return null (no lock held)
      vi.spyOn(backendProvider, 'checkLock').mockResolvedValue(null);

      const result = await stateMachine.autoRecover(stackName, 'resume');

      expect(result.action).toBe('resumed');
      expect(result.checkpoint).toBe(0);
      expect(result.changeSet).toEqual(changeSet);
    });

    it('should rollback deployment when strategy is rollback', async () => {
      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      const result = await stateMachine.autoRecover(stackName, 'rollback');

      expect(result.action).toBe('rolled_back');

      const state = await stateMachine.getState(stackName);
      expect(state!.status).toBe('ROLLED_BACK');
    });

    it('should return none if no incomplete deployment', async () => {
      const result = await stateMachine.autoRecover(stackName, 'resume');

      expect(result.action).toBe('none');
    });
  });

  describe('event listeners', () => {
    it('should allow subscribing and unsubscribing', async () => {
      const handler = vi.fn();

      stateMachine.on('started', handler);

      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();
      await stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      expect(handler).toHaveBeenCalledOnce();

      // Unsubscribe
      stateMachine.off('started', handler);

      // Start another deployment
      await stateMachine.completeDeployment(stackName);
      await stateMachine.startDeployment('stack2', changeSet, cloudDOM, user);

      // Handler should not be called again
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('retry logic', () => {
    it('should retry on transient backend failures', async () => {
      let attempts = 0;
      const failingBackend = {
        ...backendProvider,
        saveState: async (stackName: string, state: DeploymentState) => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Transient error');
          }
          return backendProvider.saveState(stackName, state);
        },
      } as any;

      const sm = new StateMachine(failingBackend, { maxRetries: 3 });

      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await sm.startDeployment(stackName, changeSet, cloudDOM, user);

      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const failingBackend = {
        ...backendProvider,
        saveState: async () => {
          throw new Error('Persistent error');
        },
      } as any;

      const sm = new StateMachine(failingBackend, { maxRetries: 2 });

      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await expect(
        sm.startDeployment(stackName, changeSet, cloudDOM, user)
      ).rejects.toThrow(DeploymentError);
    });
  });

  describe('snapshots', () => {
    it('should save snapshots when enabled', async () => {
      const sm = new StateMachine(backendProvider, { enableSnapshots: true });

      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await sm.startDeployment(stackName, changeSet, cloudDOM, user);
      await sm.updateCheckpoint(stackName, 0);
      await sm.completeDeployment(stackName);

      const snapshots = backendProvider.getSnapshots(stackName);
      expect(snapshots.length).toBeGreaterThan(0);
    });

    it('should not save snapshots when disabled', async () => {
      const sm = new StateMachine(backendProvider, { enableSnapshots: false });

      const changeSet = createMockChangeSet();
      const cloudDOM = createMockCloudDOM();

      await sm.startDeployment(stackName, changeSet, cloudDOM, user);
      await sm.updateCheckpoint(stackName, 0);

      const snapshots = backendProvider.getSnapshots(stackName);
      expect(snapshots).toHaveLength(0);
    });
  });
});
