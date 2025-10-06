// CloudDOMBuilder edge cases - Production-critical scenarios

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudDOMBuilder } from '@/core/CloudDOMBuilder';
import { createMockFiber, createMockCloudDOM, createMockCloudProvider } from '../helpers';
import { CloudDOMNode } from '@/core/types';

describe('CloudDOMBuilder - Edge Cases', () => {
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

  describe('Validation Edge Cases', () => {
    it('should throw error for duplicate resource IDs', async () => {
      const duplicateCloudDOM1 = createMockCloudDOM({
        id: 'duplicate-id',
        path: ['service'],
      });

      const duplicateCloudDOM2 = createMockCloudDOM({
        id: 'duplicate-id',
        path: ['service'],
      });

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function Service1() {},
            path: ['service'],
            cloudDOMNode: duplicateCloudDOM1,
          }),
          createMockFiber({
            type: function Service2() {},
            path: ['service'],
            cloudDOMNode: duplicateCloudDOM2,
          }),
        ],
      });

      await expect(builder.build(fiber)).rejects.toThrow(/Duplicate CloudDOMNode id detected/);
    });

    it('should skip nodes with empty path array', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const invalidCloudDOM = createMockCloudDOM({
        id: 'invalid',
        path: [],
      });

      const fiber = createMockFiber({
        type: function Component() {},
        path: ['component'],
        cloudDOMNode: invalidCloudDOM,
      });

      const cloudDOM = await builder.build(fiber);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping invalid CloudDOM node')
      );
      expect(cloudDOM).toEqual([]);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Circular Reference Detection', () => {
    it('should detect circular hierarchy references', async () => {
      const parent: CloudDOMNode = createMockCloudDOM({
        id: 'parent',
        path: ['parent'],
      });

      const child: CloudDOMNode = createMockCloudDOM({
        id: 'parent.child',
        path: ['parent', 'child'],
      });

      // Create a cycle
      parent.children = [child];
      child.children = [parent];

      expect(() => (builder as any).detectCircularRefs([parent])).toThrow(
        /Circular hierarchy detected/
      );
    });

    it('should detect indirect circular references', async () => {
      const a: CloudDOMNode = createMockCloudDOM({
        id: 'a',
        path: ['a'],
      });

      const b: CloudDOMNode = createMockCloudDOM({
        id: 'a.b',
        path: ['a', 'b'],
      });

      const c: CloudDOMNode = createMockCloudDOM({
        id: 'a.b.c',
        path: ['a', 'b', 'c'],
      });

      a.children = [b];
      b.children = [c];
      c.children = [a]; // Creates indirect cycle

      expect(() => (builder as any).detectCircularRefs([a])).toThrow(/Circular hierarchy detected/);
    });

    it('should not throw for valid deep hierarchy without cycles', () => {
      const a: CloudDOMNode = createMockCloudDOM({
        id: 'a',
        path: ['a'],
      });

      const b: CloudDOMNode = createMockCloudDOM({
        id: 'a.b',
        path: ['a', 'b'],
      });

      const c: CloudDOMNode = createMockCloudDOM({
        id: 'a.b.c',
        path: ['a', 'b', 'c'],
      });

      a.children = [b];
      b.children = [c];
      // No cycle

      expect(() => (builder as any).detectCircularRefs([a])).not.toThrow();
    });
  });

  describe('Path Normalization', () => {
    it('should normalize paths consistently', async () => {
      const cloudDOMNode = createMockCloudDOM({
        id: 'Unnormalized',
        path: [' Root/Service '],
      });

      const fiber = createMockFiber({
        type: function Comp() {},
        path: ['Root/Service '],
        cloudDOMNode,
      });

      const cloudDOM = await builder.build(fiber);

      expect(cloudDOM[0].id).toBe('root-service'); // normalized
      expect(cloudDOM[0].path).toEqual(['root-service']);
    });

    it('should normalize mixed case and special characters', async () => {
      const cloudDOMNode = createMockCloudDOM({
        id: 'original-id',
        path: ['MyApp', 'API Service', 'Worker/Task'],
      });

      const fiber = createMockFiber({
        type: function Comp() {},
        path: ['MyApp', 'API Service', 'Worker/Task'],
        cloudDOMNode,
      });

      const cloudDOM = await builder.build(fiber);

      expect(cloudDOM[0].id).toBe('my-app.api-service.worker-task');
      expect(cloudDOM[0].path).toEqual(['my-app', 'api-service', 'worker-task']);
    });

    it('should handle paths with leading/trailing hyphens', async () => {
      const cloudDOMNode = createMockCloudDOM({
        id: 'original',
        path: ['-service-'],
      });

      const fiber = createMockFiber({
        type: function Comp() {},
        path: ['-service-'],
        cloudDOMNode,
      });

      const cloudDOM = await builder.build(fiber);

      expect(cloudDOM[0].id).toBe('service'); // hyphens trimmed
      expect(cloudDOM[0].path).toEqual(['service']);
    });
  });

  describe('Parent Lookup Edge Cases', () => {
    it('should not treat similar prefixes as parent-child', async () => {
      const serviceNode = createMockCloudDOM({
        id: 'registry.service',
        path: ['registry', 'service'],
      });

      const serviceANode = createMockCloudDOM({
        id: 'registry.serviceA',
        path: ['registry', 'serviceA'],
      });

      const registryNode = createMockCloudDOM({
        id: 'registry',
        path: ['registry'],
      });

      const nodes = [serviceNode, serviceANode, registryNode];
      const roots = (builder as any).buildHierarchy(nodes);

      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe('registry');
      expect(roots[0].children).toHaveLength(2);

      // Verify siblings are not nested under each other
      const childIds = roots[0].children.map((c: CloudDOMNode) => c.id).sort();
      expect(childIds).toEqual(['registry.service', 'registry.serviceA']);
    });
  });

  describe('Hook Error Handling', () => {
    it('should recover from hook errors in buildSafe()', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      builder.setHooks({
        beforeBuild: async () => {
          throw new Error('Telemetry failed');
        },
      });

      const cloudDOMNode = createMockCloudDOM({
        id: 'comp',
        path: ['comp'],
      });

      const fiber = createMockFiber({
        type: function Comp() {},
        path: ['comp'],
        cloudDOMNode,
      });

      const result = await builder.buildSafe(fiber);

      // Non-critical hook errors are swallowed, build continues successfully
      expect(result).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('beforeBuild hook failed'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      builder.setHooks({}); // Reset hooks
    });

    it('should handle non-Error throws in hooks gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      builder.setHooks({
        beforeBuild: () => {
          throw 'string-error'; // Non-Error throw
        },
      });

      const cloudDOMNode = createMockCloudDOM({
        id: 'component',
        path: ['component'],
      });

      const fiber = createMockFiber({
        type: function Component() {},
        path: ['component'],
        cloudDOMNode,
      });

      const result = await builder.build(fiber);

      expect(result).toHaveLength(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('beforeBuild hook failed'),
        'string-error'
      );

      consoleErrorSpy.mockRestore();
      builder.setHooks({}); // Reset hooks
    });

    it('should re-throw validation errors from beforeBuild hook', async () => {
      builder.setHooks({
        beforeBuild: async () => {
          throw new Error('Validation failed: missing required prop');
        },
      });

      const cloudDOMNode = createMockCloudDOM({
        id: 'component',
        path: ['component'],
      });

      const fiber = createMockFiber({
        type: function Component() {},
        path: ['component'],
        cloudDOMNode,
      });

      await expect(builder.build(fiber)).rejects.toThrow('Validation failed');

      builder.setHooks({}); // Reset hooks
    });

    it('should handle afterBuild hook errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      builder.setHooks({
        afterBuild: async () => {
          throw new Error('Telemetry upload failed');
        },
      });

      const cloudDOMNode = createMockCloudDOM({
        id: 'component',
        path: ['component'],
      });

      const fiber = createMockFiber({
        type: function Component() {},
        path: ['component'],
        cloudDOMNode,
      });

      const result = await builder.build(fiber);

      expect(result).toHaveLength(1); // Build should succeed despite hook failure
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('afterBuild hook failed'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      builder.setHooks({}); // Reset hooks
    });
  });

  describe('Development Mode Logging', () => {
    it('should log debug info in development mode only', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const cloudDOMNode = createMockCloudDOM({
        id: 'comp',
        path: ['comp'],
      });

      const fiber = createMockFiber({
        type: function Comp() {},
        path: ['comp'],
        cloudDOMNode,
      });

      await builder.build(fiber);
      expect(debugSpy).toHaveBeenCalled();

      process.env.NODE_ENV = 'production';
      debugSpy.mockClear();

      await builder.build(fiber);
      expect(debugSpy).not.toHaveBeenCalled();

      debugSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
});
