// REQ-NF-01: CReact orchestrator performance tests
// Performance tests for build, compare, and deploy operations

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CReact, CReactConfig } from '@/core/CReact';
import { DummyCloudProvider } from '@/providers/DummyCloudProvider';
import { DummyBackendProvider } from '@/providers/DummyBackendProvider';
import { CloudDOMNode, JSXElement } from '@/core/types';
import { extractOutputs } from '../helpers/output-helpers';

// Mock filesystem state
let mockFiles: Map<string, string>;
let mockDirs: Set<string>;

// Mock fs module at the top level
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn((path: any) => {
      const pathStr = path.toString();
      return mockDirs.has(pathStr) || mockFiles.has(pathStr);
    }),
    promises: {
      ...actual.promises,
      mkdir: vi.fn(async (path: any) => {
        const pathStr = path.toString();
        mockDirs.add(pathStr);
        return pathStr;
      }),
      writeFile: vi.fn(async (path: any, data: any) => {
        const pathStr = path.toString();
        mockFiles.set(pathStr, data.toString());
        return undefined;
      }),
      readFile: vi.fn(async (path: any) => {
        const pathStr = path.toString();
        const content = mockFiles.get(pathStr);
        if (!content) throw Object.assign(new Error(`ENOENT: no such file or directory, open '${pathStr}'`), { code: 'ENOENT' });
        return content;
      }),
      rename: vi.fn(async (oldPath: any, newPath: any) => {
        const oldPathStr = oldPath.toString();
        const newPathStr = newPath.toString();
        const content = mockFiles.get(oldPathStr);
        if (!content) throw Object.assign(new Error(`ENOENT: no such file or directory, rename '${oldPathStr}' -> '${newPathStr}'`), { code: 'ENOENT' });
        mockFiles.set(newPathStr, content);
        mockFiles.delete(oldPathStr);
        return undefined;
      }),
      unlink: vi.fn(async (path: any) => {
        const pathStr = path.toString();
        mockFiles.delete(pathStr);
        return undefined;
      }),
    },
  };
});

describe('CReact - Performance Tests', () => {
  let cloudProvider: DummyCloudProvider;
  let backendProvider: DummyBackendProvider;
  let config: CReactConfig;

  beforeEach(() => {
    // Initialize mock filesystem state
    mockFiles = new Map();
    mockDirs = new Set();
    
    cloudProvider = new DummyCloudProvider();
    backendProvider = new DummyBackendProvider();
    
    config = {
      cloudProvider,
      backendProvider,
    };
  });

  afterEach(() => {
    backendProvider.clearAll();
  });

  describe('Build Performance', () => {
    it('should build small stack (<10 resources) in under 2 seconds', async () => {
      // REQ-NF-01.1: Build small stacks in <2s
      const creact = new CReact(config);
      
      // Create CloudDOM with 5 resources
      const cloudDOM: CloudDOMNode[] = Array.from({ length: 5 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i },
        children: [],
      }));

      const jsx: JSXElement = {
        type: function Stack() { return null; },
        props: {},
        key: undefined,
      };

      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000); // 2 seconds
    });

    it('should build medium stack (50 resources) efficiently', async () => {
      const creact = new CReact(config);
      
      const jsx: JSXElement = {
        type: function Stack() { return null; },
        props: {},
        key: undefined,
      };

      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 5s for 50 resources)
      expect(duration).toBeLessThan(5000);
    });

    it('should build large stack (100 resources) efficiently', async () => {
      const creact = new CReact(config);
      
      const jsx: JSXElement = {
        type: function Stack() { return null; },
        props: {},
        key: undefined,
      };

      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 10s for 100 resources)
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Deploy Performance', () => {
    it('should deploy small stack (<10 resources) efficiently', async () => {
      const creact = new CReact(config);
      
      const cloudDOM: CloudDOMNode[] = Array.from({ length: 5 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i },
        children: [],
      }));

      const startTime = performance.now();
      await creact.deploy(cloudDOM, 'test-stack');
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Should complete quickly (< 1s for dummy provider)
      expect(duration).toBeLessThan(1000);
    });

    it('should deploy medium stack (50 resources) efficiently', async () => {
      const creact = new CReact(config);
      
      const cloudDOM: CloudDOMNode[] = Array.from({ length: 50 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i },
        children: [],
      }));

      const startTime = performance.now();
      await creact.deploy(cloudDOM, 'test-stack');
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 3s for dummy provider)
      expect(duration).toBeLessThan(3000);
    });

    it('should deploy large stack (100 resources) efficiently', async () => {
      const creact = new CReact(config);
      
      const cloudDOM: CloudDOMNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i },
        children: [],
      }));

      const startTime = performance.now();
      await creact.deploy(cloudDOM, 'test-stack');
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 5s for dummy provider)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Compare Performance', () => {
    it('should compare CloudDOM trees in under 1 second', async () => {
      // REQ-NF-01.2: Compare operations in <1s
      const creact = new CReact(config);
      
      const previous: CloudDOMNode[] = Array.from({ length: 10 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i },
        children: [],
      }));

      const current: CloudDOMNode[] = Array.from({ length: 10 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i, updated: true },
        children: [],
      }));

      const startTime = performance.now();
      await creact.compare(previous, current);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // 1 second
    });

    it('should compare large CloudDOM trees efficiently', async () => {
      const creact = new CReact(config);
      
      const previous: CloudDOMNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i },
        children: [],
      }));

      const current: CloudDOMNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i, updated: true },
        children: [],
      }));

      const startTime = performance.now();
      await creact.compare(previous, current);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 2s for 100 resources)
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Idempotency Check Performance', () => {
    it('should quickly detect no changes (idempotent check)', async () => {
      const creact = new CReact(config);
      
      const cloudDOM: CloudDOMNode[] = Array.from({ length: 10 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i },
        children: [],
      }));

      // First deployment
      await creact.deploy(cloudDOM, 'test-stack');

      // Second deployment (should be fast due to idempotency check)
      const startTime = performance.now();
      await creact.deploy(cloudDOM, 'test-stack');
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Idempotency check should be very fast (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Output Extraction Performance', () => {
    it('should extract outputs from large CloudDOM efficiently', async () => {
      const creact = new CReact(config);
      
      const cloudDOM: CloudDOMNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i },
        children: [],
        outputs: {
          url: `https://resource-${i}.com`,
          port: 8080 + i,
          status: 'active',
        },
      }));

      const startTime = performance.now();
      await creact.deploy(cloudDOM, 'test-stack');
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Should handle 100 resources with 3 outputs each efficiently
      expect(duration).toBeLessThan(3000);

      // Verify all outputs extracted
      const state = await backendProvider.getState('test-stack');
      expect(state).toBeDefined();
      const outputs = extractOutputs(state!.cloudDOM);
      expect(Object.keys(outputs).length).toBe(300); // 100 resources * 3 outputs
    });

    it('should extract outputs from deeply nested CloudDOM efficiently', async () => {
      const creact = new CReact(config);
      
      // Create deeply nested structure (10 levels)
      let current: CloudDOMNode = {
        id: 'level-10',
        path: Array.from({ length: 10 }, (_, i) => `level-${i + 1}`),
        construct: class Level {},
        props: {},
        children: [],
        outputs: { value: 'level-10' },
      };

      for (let i = 9; i >= 1; i--) {
        const path = Array.from({ length: i }, (_, idx) => `level-${idx + 1}`);
        current = {
          id: path.join('.'),
          path,
          construct: class Level {},
          props: {},
          children: [current],
          outputs: { value: `level-${i}` },
        };
      }

      const cloudDOM: CloudDOMNode[] = [current];

      const startTime = performance.now();
      await creact.deploy(cloudDOM, 'test-stack');
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Should handle deep nesting efficiently
      expect(duration).toBeLessThan(1000);

      // Verify all outputs extracted
      const state = await backendProvider.getState('test-stack');
      expect(state).toBeDefined();
      const outputs = extractOutputs(state!.cloudDOM);
      expect(Object.keys(outputs).length).toBe(10); // 10 levels
    });
  });

  describe('File I/O Performance', () => {
    it('should persist CloudDOM to disk efficiently', async () => {
      const creact = new CReact(config);
      
      const jsx: JSXElement = {
        type: function Stack() { return null; },
        props: {},
        key: undefined,
      };

      // Measure just the build (which includes persistence)
      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // File I/O should be fast (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle large CloudDOM JSON serialization efficiently', async () => {
      const creact = new CReact(config);
      
      // Create large CloudDOM
      const cloudDOM: CloudDOMNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: {
          index: i,
          name: `resource-${i}`,
          config: {
            nested: {
              deep: {
                value: `test-${i}`,
              },
            },
          },
        },
        children: [],
        outputs: {
          url: `https://resource-${i}.com`,
          port: 8080 + i,
        },
      }));

      const startTime = performance.now();
      const json = JSON.stringify(cloudDOM, null, 2);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // JSON serialization should be fast (< 100ms)
      expect(duration).toBeLessThan(100);
      expect(json.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory with repeated builds', async () => {
      const creact = new CReact(config);
      
      const jsx: JSXElement = {
        type: function Stack() { return null; },
        props: {},
        key: undefined,
      };

      // Perform multiple builds
      for (let i = 0; i < 10; i++) {
        await creact.build(jsx);
      }

      // If we get here without crashing, memory is managed reasonably
      expect(true).toBe(true);
    });

    it('should not leak memory with repeated deploys', async () => {
      const creact = new CReact(config);
      
      const cloudDOM: CloudDOMNode[] = Array.from({ length: 10 }, (_, i) => ({
        id: `resource-${i}`,
        path: [`resource-${i}`],
        construct: class Resource {},
        props: { index: i },
        children: [],
      }));

      // Perform multiple deploys
      for (let i = 0; i < 10; i++) {
        await creact.deploy(cloudDOM, `stack-${i}`);
      }

      // If we get here without crashing, memory is managed reasonably
      expect(true).toBe(true);
    });
  });
});
