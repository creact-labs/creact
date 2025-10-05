// CloudDOMBuilder performance tests - Benchmarks and stress tests

import { describe, it, expect, beforeEach } from 'vitest';
import { CloudDOMBuilder } from '../../core/CloudDOMBuilder';
import { createMockFiber, createMockCloudDOM, createMockCloudProvider } from '../helpers';

describe('CloudDOMBuilder - Performance', () => {
  let builder: CloudDOMBuilder;
  let cloudProvider: ReturnType<typeof createMockCloudProvider>['provider'];
  let cleanup: () => void;

  beforeEach(() => {
    const mock = createMockCloudProvider();
    cloudProvider = mock.provider;
    cleanup = mock.cleanup;
    builder = new CloudDOMBuilder(cloudProvider);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Large Tree Building', () => {
    it('should handle 1000 nodes efficiently', async () => {
      const nodes: ReturnType<typeof createMockFiber>[] = [];

      for (let i = 0; i < 1000; i++) {
        nodes.push(
          createMockFiber({
            type: function Node() {},
            path: ['root', `child-${i}`],
            cloudDOMNode: createMockCloudDOM({
              id: `root.child-${i}`,
              path: ['root', `child-${i}`],
            }),
          })
        );
      }

      const fiber = createMockFiber({
        type: function Root() {},
        path: ['root'],
        cloudDOMNode: createMockCloudDOM({
          id: 'root',
          path: ['root'],
        }),
        children: nodes,
      });

      const start = Date.now();
      const cloudDOM = await builder.build(fiber);
      const duration = Date.now() - start;

      expect(cloudDOM).toHaveLength(1);
      expect(cloudDOM[0].children.length).toBe(1000);
      expect(duration).toBeLessThan(150); // Should complete in under 150ms
    });
  });
});
