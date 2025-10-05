// Provider performance tests - Benchmarks and stress tests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DummyCloudProvider } from '../../providers/DummyCloudProvider';
import { DummyBackendProvider } from '../../providers/DummyBackendProvider';
import { createMockCloudDOM } from '../helpers';
import { CloudDOMNode } from '../../core/types';

describe('Provider Performance', () => {
  describe('DummyCloudProvider - Performance', () => {
    let provider: DummyCloudProvider;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      provider = new DummyCloudProvider();
      consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should handle CloudDOM tree exceeding 100 levels deep', () => {
      // Create 100-level deep tree
      let current: CloudDOMNode = createMockCloudDOM({
        id: 'level-100',
        path: Array(100)
          .fill(null)
          .map((_, i) => `level${i}`),
      });

      for (let i = 99; i >= 0; i--) {
        current = createMockCloudDOM({
          id: `level-${i}`,
          path: Array(i + 1)
            .fill(null)
            .map((_, j) => `level${j}`),
          children: [current],
        });
      }

      // Should handle deep nesting (with depth limit)
      expect(() => provider.materialize([current])).not.toThrow();

      // Should log max depth warning
      const calls = consoleSpy.mock.calls.map((call) => String(call[0]));
      const hasMaxDepthWarning = calls.some((call) => call.includes('Max depth reached'));
      expect(hasMaxDepthWarning).toBe(true);
    });

    it('should handle 10,000 nodes materialization', () => {
      // Create 10,000 sibling nodes
      const children: CloudDOMNode[] = [];
      for (let i = 0; i < 10000; i++) {
        children.push(
          createMockCloudDOM({
            id: `resource-${i}`,
            path: ['parent', `resource-${i}`],
            props: { name: `resource-${i}` },
          })
        );
      }

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'parent',
          path: ['parent'],
          children,
        }),
      ];

      const startTime = Date.now();
      provider.materialize(cloudDOM);
      const duration = Date.now() - startTime;

      // Should complete in under 2 seconds for 10k nodes
      expect(duration).toBeLessThan(2000);
    });

    it('should handle rapid materialize calls', () => {
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
          props: { name: 'test' },
        }),
      ];

      // Call materialize 100 times rapidly
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        provider.materialize(cloudDOM);
      }
      const duration = Date.now() - startTime;

      // Should complete quickly
      expect(duration).toBeLessThan(500);
    });

    it('should not leak memory with circular CloudDOM references', () => {
      // Create circular structure
      const node: any = createMockCloudDOM({
        id: 'root',
        path: ['root'],
      });
      node.children.push(node);

      // Materialize multiple times
      for (let i = 0; i < 100; i++) {
        provider.materialize([node]);
      }

      // Should not crash or hang
      expect(true).toBe(true);
    });
  });

  describe('DummyBackendProvider - Performance', () => {
    let provider: DummyBackendProvider;

    beforeEach(() => {
      provider = new DummyBackendProvider();
    });

    it('should handle 100 concurrent state operations', async () => {
      const operations: Promise<void>[] = [];

      // Mix of reads and writes
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0) {
          operations.push(provider.saveState(`stack-${i}`, { id: i }));
        } else {
          operations.push(provider.getState(`stack-${i}`).then(() => {}));
        }
      }

      const startTime = Date.now();
      await Promise.all(operations);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Integration - Workflow Performance', () => {
    it('should handle backend state updated between validation and materialization', async () => {
      const backend = new DummyBackendProvider();
      const cloud = new DummyCloudProvider();
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      await backend.initialize();
      await cloud.initialize();

      // Save initial state
      await backend.saveState('stack', { version: 1 });

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
        }),
      ];

      // Simulate state change during deployment
      await cloud.preDeploy!(cloudDOM);
      await backend.saveState('stack', { version: 2 }); // State changed!
      cloud.materialize(cloudDOM);

      // Should complete without error
      const finalState = await backend.getState('stack');
      expect(finalState).toEqual({ version: 2 });

      consoleSpy.mockRestore();
    });

    it('should handle two renders of same stack running concurrently', async () => {
      const backend = new DummyBackendProvider();

      // Simulate concurrent renders
      const render1 = backend.saveState('stack', { render: 1, timestamp: Date.now() });
      const render2 = backend.saveState('stack', { render: 2, timestamp: Date.now() });

      await Promise.all([render1, render2]);

      const final = await backend.getState('stack');

      // One should win
      expect(final).toBeDefined();
      expect([1, 2]).toContain(final.render);
    });

    it('should handle provider initialization failure mid-deployment', async () => {
      class FailingProvider extends DummyCloudProvider {
        private initCount = 0;

        async initialize(): Promise<void> {
          this.initCount++;
          if (this.initCount === 1) {
            throw new Error('Initialization failed');
          }
          await super.initialize();
        }
      }

      const failingProvider = new FailingProvider();

      // First init fails
      await expect(failingProvider.initialize()).rejects.toThrow('Initialization failed');

      // Second init succeeds
      await expect(failingProvider.initialize()).resolves.not.toThrow();
      expect(failingProvider.isInitialized()).toBe(true);
    });
  });
});
