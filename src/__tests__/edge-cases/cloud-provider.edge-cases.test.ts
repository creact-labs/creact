// DummyCloudProvider edge cases - Production-critical scenarios

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DummyCloudProvider } from '../../providers/DummyCloudProvider';
import { createMockCloudDOM } from '../helpers';
import { CloudDOMNode } from '../../core/types';

describe('DummyCloudProvider - Edge Cases', () => {
  let provider: DummyCloudProvider;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new DummyCloudProvider();
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Empty and Edge Case CloudDOM', () => {
    it('should handle CloudDOM with no outputs', () => {
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
          // No outputs property
        }),
      ];

      expect(() => provider.materialize(cloudDOM)).not.toThrow();
    });

    it('should handle CloudDOM with empty outputs', () => {
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
          outputs: {},
        }),
      ];

      expect(() => provider.materialize(cloudDOM)).not.toThrow();
    });

    it('should handle deeply nested CloudDOM', () => {
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'level1',
          path: ['level1'],
          children: [
            createMockCloudDOM({
              id: 'level1.level2',
              path: ['level1', 'level2'],
              children: [
                createMockCloudDOM({
                  id: 'level1.level2.level3',
                  path: ['level1', 'level2', 'level3'],
                }),
              ],
            }),
          ],
        }),
      ];

      expect(() => provider.materialize(cloudDOM)).not.toThrow();
    });

    it('should handle CloudDOM with many siblings', () => {
      const children: CloudDOMNode[] = [];
      for (let i = 0; i < 100; i++) {
        children.push(
          createMockCloudDOM({
            id: `child-${i}`,
            path: ['parent', `child-${i}`],
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

      expect(() => provider.materialize(cloudDOM)).not.toThrow();
    });
  });

  describe('Props with Non-JSON Values', () => {
    it('should handle props with functions', () => {
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
          props: {
            name: 'test',
            handler: () => 'function',
          },
        }),
      ];

      // Should not crash on logging (even though function can't be JSON.stringified)
      expect(() => provider.materialize(cloudDOM)).not.toThrow();
    });

    it('should handle props with circular references', () => {
      const circularProps: any = { name: 'test' };
      circularProps.self = circularProps;

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
          props: circularProps,
        }),
      ];

      // Should not crash on logging
      expect(() => provider.materialize(cloudDOM)).not.toThrow();
    });

    it('should handle props with unserializable symbols', () => {
      const sym = Symbol('test');
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
          props: {
            name: 'test',
            [sym]: 'symbol-value',
          },
        }),
      ];

      expect(() => provider.materialize(cloudDOM)).not.toThrow();
    });

    it('should handle props with getters that throw during JSON.stringify', () => {
      const propsWithThrowingGetter = {
        get dangerous() {
          throw new Error('Getter throws');
        },
        safe: 'value',
      };

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
          props: propsWithThrowingGetter,
        }),
      ];

      // Should handle gracefully (safeStringify catches errors)
      expect(() => provider.materialize(cloudDOM)).not.toThrow();
    });
  });

  describe('Error Flow', () => {
    it('should handle error during deployment without propagating', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
        }),
      ];

      const error = new Error('Deployment failed');

      // Should not throw
      await expect(provider.onError!(error, cloudDOM)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should handle error with empty CloudDOM', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const error = new Error('No resources');

      await expect(provider.onError!(error, [])).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should handle error with complex error object', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
        }),
      ];

      const complexError = new Error('Complex error');
      (complexError as any).code = 'ERR_DEPLOY';
      (complexError as any).details = { resource: 'resource', reason: 'timeout' };

      await expect(provider.onError!(complexError, cloudDOM)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should handle error thrown inside preDeploy', async () => {
      class ErrorProneProvider extends DummyCloudProvider {
        async preDeploy(cloudDOM: CloudDOMNode[]): Promise<void> {
          throw new Error('preDeploy failed');
        }
      }

      const errorProvider = new ErrorProneProvider();
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
        }),
      ];

      // Should propagate error (expected behavior)
      await expect(errorProvider.preDeploy!(cloudDOM)).rejects.toThrow('preDeploy failed');
    });

    it('should handle error thrown inside postDeploy', async () => {
      class ErrorProneProvider extends DummyCloudProvider {
        async postDeploy(cloudDOM: CloudDOMNode[], outputs: Record<string, any>): Promise<void> {
          throw new Error('postDeploy failed');
        }
      }

      const errorProvider = new ErrorProneProvider();
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
        }),
      ];

      // Should propagate error
      await expect(errorProvider.postDeploy!(cloudDOM, {})).rejects.toThrow('postDeploy failed');
    });

    it('should handle onError with CloudDOM missing props', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const cloudDOM: any[] = [
        {
          id: 'resource',
          path: ['resource'],
          construct: class {},
          // props missing
          children: [],
        },
      ];

      const error = new Error('Deployment failed');

      await expect(provider.onError!(error, cloudDOM)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should handle onError with malformed CloudDOM', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const cloudDOM: any[] = [
        {
          // Missing required fields
          invalid: 'structure',
        },
      ];

      const error = new Error('Deployment failed');

      await expect(provider.onError!(error, cloudDOM)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Circular References', () => {
    it('should handle props/outputs with circular references causing JSON.stringify to hang', () => {
      const circularProps: any = { name: 'test' };
      circularProps.self = circularProps;
      circularProps.nested = { parent: circularProps };

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
          props: circularProps,
          outputs: {
            circular: circularProps,
          },
        }),
      ];

      const startTime = Date.now();
      expect(() => provider.materialize(cloudDOM)).not.toThrow();
      const duration = Date.now() - startTime;

      // Should complete quickly (not hang)
      expect(duration).toBeLessThan(100);

      // Should log with [Circular] markers
      const calls = consoleSpy.mock.calls.map((call) => String(call[0]));
      const hasCircularMarker = calls.some((call) => call.includes('[Circular]'));
      expect(hasCircularMarker).toBe(true);
    });

    it('should handle node with children array containing the parent', () => {
      const parent: any = createMockCloudDOM({
        id: 'parent',
        path: ['parent'],
      });

      const child: CloudDOMNode = createMockCloudDOM({
        id: 'child',
        path: ['parent', 'child'],
        children: [parent], // Child references parent
      });

      parent.children = [child];

      // Should detect circular reference
      expect(() => provider.materialize([parent])).not.toThrow();

      // Should log circular reference marker
      const calls = consoleSpy.mock.calls.map((call) => String(call[0]));
      const hasCircularMarker = calls.some((call) => call.includes('Circular reference'));
      expect(hasCircularMarker).toBe(true);
    });
  });

  describe('Concurrent Initialization', () => {
    it('should handle multiple concurrent initializations', async () => {
      const promises: Promise<void>[] = Array(10)
        .fill(null)
        .map(() => provider.initialize());
      await Promise.all(promises);

      expect(provider.isInitialized()).toBe(true);
    });
  });

  describe('Recursive Calls', () => {
    it('should handle materialize called recursively', async () => {
      // Simulate preDeploy calling materialize
      class RecursiveProvider extends DummyCloudProvider {
        async preDeploy(cloudDOM: CloudDOMNode[]): Promise<void> {
          // User code accidentally calls materialize
          this.materialize(cloudDOM);
          await super.preDeploy(cloudDOM);
        }
      }

      const recursiveProvider = new RecursiveProvider();
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
        }),
      ];

      await recursiveProvider.preDeploy(cloudDOM);

      // Should not crash
      expect(() => recursiveProvider.materialize(cloudDOM)).not.toThrow();
    });
  });

  describe('Methods Called Before Initialize', () => {
    it('should handle provider methods called before initialize', async () => {
      const uninitializedProvider = new DummyCloudProvider();

      // Call methods before initialize
      expect(uninitializedProvider.isInitialized()).toBe(false);

      // Methods should work (initialization is optional)
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
        }),
      ];

      expect(() => uninitializedProvider.materialize(cloudDOM)).not.toThrow();
    });
  });
});
