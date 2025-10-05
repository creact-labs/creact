// REQ-01: CloudDOMBuilder unit tests - Core functionality

import { describe, it, expect, beforeEach } from 'vitest';
import { CloudDOMBuilder } from '@/core/CloudDOMBuilder';
import { createMockFiber, createMockCloudDOM, createMockCloudProvider } from '../helpers';
import { FiberNode, CloudDOMNode } from '@/core/types';

describe('CloudDOMBuilder - Core Functionality', () => {
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

  describe('Dependency Injection', () => {
    it('should receive ICloudProvider via constructor (REQ-04)', () => {
      expect(builder.getCloudProvider()).toBe(cloudProvider);
    });

    it('should not inherit from provider', () => {
      // Verify composition over inheritance
      expect(builder).not.toBeInstanceOf(cloudProvider.constructor);
      expect(Object.getPrototypeOf(builder).constructor.name).toBe('CloudDOMBuilder');
    });
  });

  describe('build() - Basic Operations', () => {
    it('should throw error for null Fiber tree', async () => {
      await expect(builder.build(null as any)).rejects.toThrow(
        'Cannot build CloudDOM from null Fiber tree'
      );
    });

    it('should return empty array for Fiber with no cloudDOMNode', async () => {
      const fiber = createMockFiber({
        type: function Container() {},
        path: ['container'],
      });

      const cloudDOM = await builder.build(fiber);

      expect(cloudDOM).toEqual([]);
    });

    it('should build single CloudDOM node from Fiber with cloudDOMNode', async () => {
      class DummyRegistry {}

      const cloudDOMNode = createMockCloudDOM({
        id: 'registry',
        path: ['registry'],
        construct: DummyRegistry,
        props: { name: 'app' },
      });

      const fiber = createMockFiber({
        type: function Registry() {},
        path: ['registry'],
        cloudDOMNode,
      });

      const cloudDOM = await builder.build(fiber);

      expect(cloudDOM).toHaveLength(1);
      expect(cloudDOM[0].id).toBe('registry');
      expect(cloudDOM[0].path).toEqual(['registry']);
      expect(cloudDOM[0].construct).toBe(DummyRegistry);
      expect(cloudDOM[0].props).toEqual({ name: 'app' });
    });

    it('should filter out container components (no useInstance)', async () => {
      class Service {}

      const serviceCloudDOM = createMockCloudDOM({
        id: 'app.service',
        path: ['app', 'service'],
        construct: Service,
      });

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function Container() {},
            path: ['app', 'container'],
            children: [
              createMockFiber({
                type: function ServiceComponent() {},
                path: ['app', 'service'],
                cloudDOMNode: serviceCloudDOM,
              }),
            ],
          }),
        ],
      });

      const cloudDOM = await builder.build(fiber);

      // Container should be filtered out, but service should be included
      expect(cloudDOM).toHaveLength(1);
      expect(cloudDOM[0].id).toBe('app.service');
    });
  });

  describe('build() - Hierarchy Building', () => {
    it('should build nested hierarchy (parent → child)', async () => {
      class DummyRegistry {}
      class DummyService {}

      const childCloudDOM = createMockCloudDOM({
        id: 'registry.service',
        path: ['registry', 'service'],
        construct: DummyService,
        props: { name: 'api' },
      });

      const parentCloudDOM = createMockCloudDOM({
        id: 'registry',
        path: ['registry'],
        construct: DummyRegistry,
        props: { name: 'app' },
      });

      const fiber = createMockFiber({
        type: function Registry() {},
        path: ['registry'],
        cloudDOMNode: parentCloudDOM,
        children: [
          createMockFiber({
            type: function Service() {},
            path: ['registry', 'service'],
            cloudDOMNode: childCloudDOM,
          }),
        ],
      });

      const cloudDOM = await builder.build(fiber);

      expect(cloudDOM).toHaveLength(1);
      expect(cloudDOM[0].id).toBe('registry');
      expect(cloudDOM[0].children).toHaveLength(1);
      expect(cloudDOM[0].children[0].id).toBe('registry.service');
    });

    it('should build deep hierarchy (3+ levels)', async () => {
      class Level1 {}
      class Level2 {}
      class Level3 {}

      const level3CloudDOM = createMockCloudDOM({
        id: 'level1.level2.level3',
        path: ['level1', 'level2', 'level3'],
        construct: Level3,
      });

      const level2CloudDOM = createMockCloudDOM({
        id: 'level1.level2',
        path: ['level1', 'level2'],
        construct: Level2,
      });

      const level1CloudDOM = createMockCloudDOM({
        id: 'level1',
        path: ['level1'],
        construct: Level1,
      });

      const fiber = createMockFiber({
        type: function Level1Component() {},
        path: ['level1'],
        cloudDOMNode: level1CloudDOM,
        children: [
          createMockFiber({
            type: function Level2Component() {},
            path: ['level1', 'level2'],
            cloudDOMNode: level2CloudDOM,
            children: [
              createMockFiber({
                type: function Level3Component() {},
                path: ['level1', 'level2', 'level3'],
                cloudDOMNode: level3CloudDOM,
              }),
            ],
          }),
        ],
      });

      const cloudDOM = await builder.build(fiber);

      expect(cloudDOM).toHaveLength(1);
      expect(cloudDOM[0].id).toBe('level1');
      expect(cloudDOM[0].children).toHaveLength(1);
      expect(cloudDOM[0].children[0].id).toBe('level1.level2');
      expect(cloudDOM[0].children[0].children).toHaveLength(1);
      expect(cloudDOM[0].children[0].children[0].id).toBe('level1.level2.level3');
    });

    it('should handle multiple root-level resources', async () => {
      class Registry {}
      class Database {}

      const registryCloudDOM = createMockCloudDOM({
        id: 'registry',
        path: ['registry'],
        construct: Registry,
      });

      const databaseCloudDOM = createMockCloudDOM({
        id: 'database',
        path: ['database'],
        construct: Database,
      });

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function RegistryComponent() {},
            path: ['registry'],
            cloudDOMNode: registryCloudDOM,
          }),
          createMockFiber({
            type: function DatabaseComponent() {},
            path: ['database'],
            cloudDOMNode: databaseCloudDOM,
          }),
        ],
      });

      const cloudDOM = await builder.build(fiber);

      expect(cloudDOM).toHaveLength(2);
      // Should be sorted alphabetically
      expect(cloudDOM[0].id).toBe('database');
      expect(cloudDOM[1].id).toBe('registry');
    });
  });

  describe('buildSafe() - Error Recovery', () => {
    it('should return empty array on error', async () => {
      const cloudDOM = await builder.buildSafe(null as any);

      expect(cloudDOM).toEqual([]);
    });

    it('should return CloudDOM on success', async () => {
      const cloudDOMNode = createMockCloudDOM({
        id: 'component',
        path: ['component'],
      });

      const fiber = createMockFiber({
        type: function Component() {},
        path: ['component'],
        cloudDOMNode,
      });

      const cloudDOM = await builder.buildSafe(fiber);

      expect(cloudDOM).toHaveLength(1);
      expect(cloudDOM[0].id).toBe('component');
    });
  });

  describe('Utility Methods', () => {
    it('should convert CloudDOM tree to flat map', async () => {
      class Registry {}
      class Service {}

      const serviceCloudDOM = createMockCloudDOM({
        id: 'registry.service',
        path: ['registry', 'service'],
        construct: Service,
      });

      const registryCloudDOM = createMockCloudDOM({
        id: 'registry',
        path: ['registry'],
        construct: Registry,
      });

      const fiber = createMockFiber({
        type: function App() {},
        path: ['app'],
        children: [
          createMockFiber({
            type: function RegistryComponent() {},
            path: ['registry'],
            cloudDOMNode: registryCloudDOM,
            children: [
              createMockFiber({
                type: function ServiceComponent() {},
                path: ['registry', 'service'],
                cloudDOMNode: serviceCloudDOM,
              }),
            ],
          }),
        ],
      });

      const cloudDOM = await builder.build(fiber);
      const flatMap = builder.toFlatMap(cloudDOM);

      expect(Object.keys(flatMap)).toHaveLength(2);
      expect(flatMap['registry']).toBeDefined();
      expect(flatMap['registry.service']).toBeDefined();
      expect(flatMap['registry'].id).toBe('registry');
      expect(flatMap['registry.service'].id).toBe('registry.service');
    });

    it('should handle lifecycle hooks', async () => {
      const beforeBuildSpy = vi.fn();
      const afterBuildSpy = vi.fn();

      builder.setHooks({
        beforeBuild: beforeBuildSpy,
        afterBuild: afterBuildSpy,
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

      const cloudDOM = await builder.build(fiber);

      expect(beforeBuildSpy).toHaveBeenCalledWith(fiber);
      expect(afterBuildSpy).toHaveBeenCalledWith(cloudDOM);
    });

    it('should handle async lifecycle hooks', async () => {
      const beforeBuildSpy = vi.fn().mockResolvedValue(undefined);
      const afterBuildSpy = vi.fn().mockResolvedValue(undefined);

      builder.setHooks({
        beforeBuild: beforeBuildSpy,
        afterBuild: afterBuildSpy,
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

      await builder.build(fiber);

      expect(beforeBuildSpy).toHaveBeenCalled();
      expect(afterBuildSpy).toHaveBeenCalled();
    });
  });
});
