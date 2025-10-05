// REQ-01, REQ-04, REQ-05, REQ-07, REQ-09: CReact orchestrator edge case tests
// Edge case tests for unusual inputs, error conditions, and boundary cases

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CReact, CReactConfig } from '@/core/CReact';
import { DummyCloudProvider } from '@/providers/DummyCloudProvider';
import { DummyBackendProvider } from '@/providers/DummyBackendProvider';
import { CloudDOMNode, JSXElement } from '@/core/types';
import * as fs from 'fs';
import { cleanupCreactDir } from '../helpers/cleanup-helpers';

describe('CReact - Edge Cases', () => {
  let cloudProvider: DummyCloudProvider;
  let backendProvider: DummyBackendProvider;
  let config: CReactConfig;

  beforeEach(() => {
    cloudProvider = new DummyCloudProvider();
    backendProvider = new DummyBackendProvider();
    config = {
      cloudProvider,
      backendProvider,
    };
  });

  afterEach(() => {
    backendProvider.clearAll();
    cleanupCreactDir();
  });

  describe('Empty and Null Inputs', () => {
    it('should handle empty CloudDOM array in deploy', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [];

      await expect(creact.deploy(cloudDOM)).resolves.not.toThrow();
    });

    it('should handle empty JSX in build', async () => {
      const creact = new CReact(config);
      const jsx: JSXElement = {
        type: function Empty() { return null; },
        props: {},
        key: undefined,
      };

      const cloudDOM = await creact.build(jsx);

      expect(cloudDOM).toBeDefined();
      expect(Array.isArray(cloudDOM)).toBe(true);
    });

    it('should handle CloudDOM with empty children arrays', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'parent',
          path: ['parent'],
          construct: class Parent {},
          props: {},
          children: [], // Empty children
        },
      ];

      await expect(creact.deploy(cloudDOM)).resolves.not.toThrow();
    });

    it('should handle CloudDOM with empty props', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource',
          path: ['resource'],
          construct: class Resource {},
          props: {}, // Empty props
          children: [],
        },
      ];

      await expect(creact.deploy(cloudDOM)).resolves.not.toThrow();
    });
  });

  describe('Large CloudDOM Trees', () => {
    it('should handle deeply nested CloudDOM (10 levels)', async () => {
      const creact = new CReact(config);
      
      // Create deeply nested structure
      let current: CloudDOMNode = {
        id: 'level-10',
        path: ['level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6', 'level-7', 'level-8', 'level-9', 'level-10'],
        construct: class Level10 {},
        props: {},
        children: [],
      };

      for (let i = 9; i >= 1; i--) {
        const path = Array.from({ length: i }, (_, idx) => `level-${idx + 1}`);
        current = {
          id: path.join('.'),
          path,
          construct: class Level {},
          props: {},
          children: [current],
        };
      }

      const cloudDOM: CloudDOMNode[] = [current];

      await expect(creact.deploy(cloudDOM)).resolves.not.toThrow();
    });

    it('should handle wide CloudDOM (100 siblings)', async () => {
      const creact = new CReact(config);
      
      const cloudDOM: CloudDOMNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i },
        children: [],
      }));

      await expect(creact.deploy(cloudDOM)).resolves.not.toThrow();
    });
  });

  describe('Special Characters in IDs and Paths', () => {
    it('should handle IDs with hyphens', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'my-resource-name',
          path: ['my-resource-name'],
          construct: class Resource {},
          props: {},
          children: [],
        },
      ];

      await expect(creact.deploy(cloudDOM)).resolves.not.toThrow();
    });

    it('should handle IDs with dots (nested)', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'parent.child.grandchild',
          path: ['parent', 'child', 'grandchild'],
          construct: class Resource {},
          props: {},
          children: [],
        },
      ];

      await expect(creact.deploy(cloudDOM)).resolves.not.toThrow();
    });

    it('should handle IDs with numbers', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource-123',
          path: ['resource-123'],
          construct: class Resource {},
          props: {},
          children: [],
        },
      ];

      await expect(creact.deploy(cloudDOM)).resolves.not.toThrow();
    });
  });

  describe('Provider Failures', () => {
    it('should handle materialize throwing error', async () => {
      const failingProvider = {
        materialize: vi.fn(() => {
          throw new Error('Materialize failed');
        }),
        onError: vi.fn(),
      };

      const failingConfig: CReactConfig = {
        cloudProvider: failingProvider as any,
        backendProvider,
      };

      const creact = new CReact(failingConfig);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test',
          path: ['test'],
          construct: class Test {},
          props: {},
          children: [],
        },
      ];

      await expect(creact.deploy(cloudDOM)).rejects.toThrow('Materialize failed');
      expect(failingProvider.onError).toHaveBeenCalled();
    });

    it('should handle preDeploy hook throwing error', async () => {
      const failingProvider = {
        materialize: vi.fn(),
        preDeploy: vi.fn(async () => {
          throw new Error('PreDeploy failed');
        }),
        onError: vi.fn(),
      };

      const failingConfig: CReactConfig = {
        cloudProvider: failingProvider as any,
        backendProvider,
      };

      const creact = new CReact(failingConfig);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test',
          path: ['test'],
          construct: class Test {},
          props: {},
          children: [],
        },
      ];

      await expect(creact.deploy(cloudDOM)).rejects.toThrow('PreDeploy failed');
      expect(failingProvider.onError).toHaveBeenCalled();
      expect(failingProvider.materialize).not.toHaveBeenCalled();
    });

    it('should handle backend provider saveState failure', async () => {
      const failingBackend = {
        getState: vi.fn(async () => undefined),
        saveState: vi.fn(async () => {
          throw new Error('SaveState failed');
        }),
      };

      const failingConfig: CReactConfig = {
        cloudProvider,
        backendProvider: failingBackend as any,
      };

      const creact = new CReact(failingConfig);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test',
          path: ['test'],
          construct: class Test {},
          props: {},
          children: [],
        },
      ];

      await expect(creact.deploy(cloudDOM)).rejects.toThrow('SaveState failed');
    });

    it('should handle backend provider getState failure', async () => {
      const failingBackend = {
        getState: vi.fn(async () => {
          throw new Error('GetState failed');
        }),
        saveState: vi.fn(),
      };

      const failingConfig: CReactConfig = {
        cloudProvider,
        backendProvider: failingBackend as any,
      };

      const creact = new CReact(failingConfig);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test',
          path: ['test'],
          construct: class Test {},
          props: {},
          children: [],
        },
      ];

      await expect(creact.deploy(cloudDOM)).rejects.toThrow('GetState failed');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple builds in sequence', async () => {
      const creact = new CReact(config);
      const jsx: JSXElement = {
        type: function Root() { return null; },
        props: {},
        key: undefined,
      };

      // Should not throw
      await expect(creact.build(jsx)).resolves.toBeDefined();
      await expect(creact.build(jsx)).resolves.toBeDefined();
      await expect(creact.build(jsx)).resolves.toBeDefined();
    });

    it('should handle multiple deploys to different stacks', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test',
          path: ['test'],
          construct: class Test {},
          props: {},
          children: [],
        },
      ];

      await creact.deploy(cloudDOM, 'stack-1');
      await creact.deploy(cloudDOM, 'stack-2');
      await creact.deploy(cloudDOM, 'stack-3');

      // All stacks should have state
      expect(await backendProvider.getState('stack-1')).toBeDefined();
      expect(await backendProvider.getState('stack-2')).toBeDefined();
      expect(await backendProvider.getState('stack-3')).toBeDefined();
    });
  });

  // Filesystem Edge Cases removed - Task 8 will implement CloudDOM persistence

  describe('Output Edge Cases', () => {
    it('should handle outputs with null values', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource',
          path: ['resource'],
          construct: class Resource {},
          props: {},
          children: [],
          outputs: { value: null },
        },
      ];

      await creact.deploy(cloudDOM, 'test-stack');

      const state = await backendProvider.getState('test-stack');
      expect(state.outputs).toEqual({ 'resource.value': null });
    });

    it('should handle outputs with undefined values', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource',
          path: ['resource'],
          construct: class Resource {},
          props: {},
          children: [],
          outputs: { value: undefined },
        },
      ];

      await creact.deploy(cloudDOM, 'test-stack');

      const state = await backendProvider.getState('test-stack');
      expect(state.outputs).toEqual({ 'resource.value': undefined });
    });

    it('should handle outputs with complex objects', async () => {
      const creact = new CReact(config);
      const complexOutput = {
        nested: {
          deep: {
            value: 'test',
          },
        },
        array: [1, 2, 3],
      };

      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource',
          path: ['resource'],
          construct: class Resource {},
          props: {},
          children: [],
          outputs: { complex: complexOutput },
        },
      ];

      await creact.deploy(cloudDOM, 'test-stack');

      const state = await backendProvider.getState('test-stack');
      expect(state.outputs['resource.complex']).toEqual(complexOutput);
    });

    it('should handle outputs with special characters in keys', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource',
          path: ['resource'],
          construct: class Resource {},
          props: {},
          children: [],
          outputs: {
            'key-with-dash': 'value1',
            'key_with_underscore': 'value2',
            'keyWithCamelCase': 'value3',
          },
        },
      ];

      await creact.deploy(cloudDOM, 'test-stack');

      const state = await backendProvider.getState('test-stack');
      expect(state.outputs).toEqual({
        'resource.key-with-dash': 'value1',
        'resource.key_with_underscore': 'value2',
        'resource.keyWithCamelCase': 'value3',
      });
    });
  });

  describe('Stack Name Edge Cases', () => {
    it('should handle stack names with special characters', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test',
          path: ['test'],
          construct: class Test {},
          props: {},
          children: [],
        },
      ];

      const stackNames = [
        'stack-with-dashes',
        'stack_with_underscores',
        'stack123',
        'UPPERCASE-STACK',
      ];

      for (const stackName of stackNames) {
        await expect(creact.deploy(cloudDOM, stackName)).resolves.not.toThrow();
        expect(await backendProvider.getState(stackName)).toBeDefined();
      }
    });

    it('should handle very long stack names', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test',
          path: ['test'],
          construct: class Test {},
          props: {},
          children: [],
        },
      ];

      const longStackName = 'a'.repeat(100);

      await expect(creact.deploy(cloudDOM, longStackName)).resolves.not.toThrow();
      expect(await backendProvider.getState(longStackName)).toBeDefined();
    });
  });
});
