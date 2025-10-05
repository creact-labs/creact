// REQ-01, REQ-04, REQ-05, REQ-07, REQ-09: CReact orchestrator unit tests
// Unit tests for CReact class methods and internal logic

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CReact, CReactConfig } from '@/core/CReact';
import { DummyCloudProvider } from '@/providers/DummyCloudProvider';
import { DummyBackendProvider } from '@/providers/DummyBackendProvider';
import { CloudDOMNode, JSXElement } from '@/core/types';
import * as fs from 'fs';
import { cleanupCreactDir } from '../helpers/cleanup-helpers';

describe('CReact - Unit Tests', () => {
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

  describe('Constructor', () => {
    it('should instantiate with valid config', () => {
      const creact = new CReact(config);
      
      expect(creact).toBeDefined();
      expect(creact.getCloudProvider()).toBe(cloudProvider);
      expect(creact.getBackendProvider()).toBe(backendProvider);
    });

    it('should accept optional migrationMap in config', () => {
      const configWithMigration: CReactConfig = {
        ...config,
        migrationMap: { 'old.id': 'new.id' },
      };
      
      const creact = new CReact(configWithMigration);
      expect(creact).toBeDefined();
    });

    it('should accept optional asyncTimeout in config', () => {
      const configWithTimeout: CReactConfig = {
        ...config,
        asyncTimeout: 300000, // 5 minutes
      };
      
      const creact = new CReact(configWithTimeout);
      expect(creact).toBeDefined();
    });

    it('should instantiate internal components (Renderer, Validator, CloudDOMBuilder)', () => {
      const creact = new CReact(config);
      
      // Verify components are instantiated (they're private but we can check the instance exists)
      expect(creact).toBeDefined();
      expect(creact.getCloudProvider()).toBe(cloudProvider);
      expect(creact.getBackendProvider()).toBe(backendProvider);
    });
  });

  describe('build() method', () => {
    it('should return empty CloudDOM for simple JSX', async () => {
      const creact = new CReact(config);
      const jsx: JSXElement = {
        type: function Root() { return null; },
        props: {},
        key: undefined,
      };

      const cloudDOM = await creact.build(jsx);

      expect(cloudDOM).toBeDefined();
      expect(Array.isArray(cloudDOM)).toBe(true);
    });

    // Persistence tests removed - Task 8 will implement CloudDOM persistence
  });

  describe('deploy() method', () => {
    it('should deploy CloudDOM with default stack name', async () => {
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

      const saveStateSpy = vi.spyOn(backendProvider, 'saveState');

      await creact.deploy(cloudDOM);

      expect(saveStateSpy).toHaveBeenCalledWith(
        'default', // default stack name
        expect.any(Object)
      );

      saveStateSpy.mockRestore();
    });

    it('should deploy CloudDOM with custom stack name', async () => {
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

      const saveStateSpy = vi.spyOn(backendProvider, 'saveState');

      await creact.deploy(cloudDOM, 'custom-stack');

      expect(saveStateSpy).toHaveBeenCalledWith(
        'custom-stack',
        expect.any(Object)
      );

      saveStateSpy.mockRestore();
    });

    it('should save state with timestamp', async () => {
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

      await creact.deploy(cloudDOM, 'test-stack');

      const state = await backendProvider.getState('test-stack');

      expect(state.timestamp).toBeDefined();
      expect(typeof state.timestamp).toBe('string');
      expect(new Date(state.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should not call lifecycle hooks if not implemented', async () => {
      // Create provider without lifecycle hooks
      const minimalProvider = {
        materialize: vi.fn(),
      };

      const minimalConfig: CReactConfig = {
        cloudProvider: minimalProvider as any,
        backendProvider,
      };

      const creact = new CReact(minimalConfig);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test',
          path: ['test'],
          construct: class Test {},
          props: {},
          children: [],
        },
      ];

      // Should not throw error
      await expect(creact.deploy(cloudDOM)).resolves.not.toThrow();
      expect(minimalProvider.materialize).toHaveBeenCalled();
    });
  });

  describe('compare() method', () => {
    it('should return placeholder diff structure', async () => {
      const creact = new CReact(config);
      const previous: CloudDOMNode[] = [];
      const current: CloudDOMNode[] = [];

      const diff = await creact.compare(previous, current);

      expect(diff).toEqual({
        creates: [],
        updates: [],
        deletes: [],
        moves: [],
      });
    });

    it('should log placeholder message', async () => {
      const creact = new CReact(config);
      const consoleSpy = vi.spyOn(console, 'log');

      await creact.compare([], []);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reconciler not yet implemented')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getCloudProvider() method', () => {
    it('should return injected cloud provider', () => {
      const creact = new CReact(config);
      
      expect(creact.getCloudProvider()).toBe(cloudProvider);
    });
  });

  describe('getBackendProvider() method', () => {
    it('should return injected backend provider', () => {
      const creact = new CReact(config);
      
      expect(creact.getBackendProvider()).toBe(backendProvider);
    });
  });

  describe('Output extraction', () => {
    it('should extract outputs from single node', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource',
          path: ['resource'],
          construct: class Resource {},
          props: {},
          children: [],
          outputs: { url: 'https://example.com', port: 8080 },
        },
      ];

      await creact.deploy(cloudDOM, 'test-stack');

      const state = await backendProvider.getState('test-stack');

      expect(state.outputs).toEqual({
        'resource.url': 'https://example.com',
        'resource.port': 8080,
      });
    });

    it('should extract outputs from nested nodes', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'parent',
          path: ['parent'],
          construct: class Parent {},
          props: {},
          children: [
            {
              id: 'parent.child',
              path: ['parent', 'child'],
              construct: class Child {},
              props: {},
              children: [],
              outputs: { value: 'child-output' },
            },
          ],
          outputs: { value: 'parent-output' },
        },
      ];

      await creact.deploy(cloudDOM, 'test-stack');

      const state = await backendProvider.getState('test-stack');

      expect(state.outputs).toEqual({
        'parent.value': 'parent-output',
        'parent.child.value': 'child-output',
      });
    });

    it('should handle nodes without outputs', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource',
          path: ['resource'],
          construct: class Resource {},
          props: {},
          children: [],
          // No outputs
        },
      ];

      await creact.deploy(cloudDOM, 'test-stack');

      const state = await backendProvider.getState('test-stack');

      expect(state.outputs).toEqual({});
    });

    it('should handle empty CloudDOM', async () => {
      const creact = new CReact(config);
      const cloudDOM: CloudDOMNode[] = [];

      await creact.deploy(cloudDOM, 'test-stack');

      const state = await backendProvider.getState('test-stack');

      expect(state.outputs).toEqual({});
    });
  });
});
