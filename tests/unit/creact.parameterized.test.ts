// REQ-01, REQ-04, REQ-05: CReact orchestrator parameterized tests
// Parameterized tests for systematic coverage of various scenarios

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CReact, CReactConfig } from '@/core/CReact';
import { DummyCloudProvider } from '@/providers/DummyCloudProvider';
import { DummyBackendProvider } from '@/providers/DummyBackendProvider';
import { CloudDOMNode } from '@/core/types';
import * as fs from 'fs';
import { cleanupCreactDir } from '../helpers/cleanup-helpers';
import { extractOutputs } from '../helpers/output-helpers';

describe('CReact - Parameterized Tests', () => {
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

  describe('Deploy with various CloudDOM sizes', () => {
    const testCases = [
      { size: 0, description: 'empty CloudDOM' },
      { size: 1, description: 'single resource' },
      { size: 5, description: 'small stack' },
      { size: 10, description: 'medium stack' },
      { size: 25, description: 'large stack' },
    ];

    testCases.forEach(({ size, description }) => {
      it(`should deploy ${description} (${size} resources)`, async () => {
        const creact = new CReact(config);

        const cloudDOM: CloudDOMNode[] = Array.from({ length: size }, (_, i) => ({
          id: `resource-${i}`,
          path: [`resource-${i}`],
          construct: class Resource {},
          props: { index: i },
          children: [],
        }));

        await expect(creact.deploy(cloudDOM, 'test-stack')).resolves.not.toThrow();

        const state = await backendProvider.getState('test-stack');
        if (size === 0) {
          // Empty CloudDOM deployment is skipped, state may be undefined
          expect(state).toBeUndefined();
        } else {
          expect(state).toBeDefined();
          expect(state!.cloudDOM).toHaveLength(size);
        }
      });
    });
  });

  describe('Deploy with various nesting depths', () => {
    const testCases = [
      { depth: 1, description: 'flat structure' },
      { depth: 2, description: 'one level nesting' },
      { depth: 3, description: 'two levels nesting' },
      { depth: 5, description: 'deep nesting' },
      { depth: 10, description: 'very deep nesting' },
    ];

    testCases.forEach(({ depth, description }) => {
      it(`should deploy ${description} (depth ${depth})`, async () => {
        const creact = new CReact(config);

        // Create nested structure
        let current: CloudDOMNode = {
          id: `level-${depth}`,
          path: Array.from({ length: depth }, (_, i) => `level-${i + 1}`),
          construct: class Level {},
          props: {},
          children: [],
        };

        for (let i = depth - 1; i >= 1; i--) {
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

        await expect(creact.deploy(cloudDOM, 'test-stack')).resolves.not.toThrow();
      });
    });
  });

  describe('Deploy with various output configurations', () => {
    const testCases = [
      {
        outputs: undefined,
        description: 'no outputs',
        expectedCount: 0,
      },
      {
        outputs: {},
        description: 'empty outputs',
        expectedCount: 0,
      },
      {
        outputs: { url: 'https://example.com' },
        description: 'single output',
        expectedCount: 1,
      },
      {
        outputs: { url: 'https://example.com', port: 8080, status: 'active' },
        description: 'multiple outputs',
        expectedCount: 3,
      },
      {
        outputs: {
          url: 'https://example.com',
          config: { nested: { value: 'test' } },
          array: [1, 2, 3],
        },
        description: 'complex outputs',
        expectedCount: 3,
      },
    ];

    testCases.forEach(({ outputs: nodeOutputs, description, expectedCount }) => {
      it(`should handle ${description}`, async () => {
        const creact = new CReact(config);

        const cloudDOM: CloudDOMNode[] = [
          {
            id: 'resource',
            path: ['resource'],
            construct: class Resource {},
            props: {},
            children: [],
            outputs: nodeOutputs,
          },
        ];

        await creact.deploy(cloudDOM, 'test-stack');

        const state = await backendProvider.getState('test-stack');
        expect(state).toBeDefined();
        const extractedOutputs = extractOutputs(state!.cloudDOM);
        expect(Object.keys(extractedOutputs).length).toBe(expectedCount);
      });
    });
  });

  describe('Deploy with various prop configurations', () => {
    const testCases = [
      {
        props: {},
        description: 'empty props',
      },
      {
        props: { name: 'test' },
        description: 'single prop',
      },
      {
        props: { name: 'test', port: 8080, enabled: true },
        description: 'multiple props',
      },
      {
        props: {
          name: 'test',
          config: { nested: { deep: { value: 'test' } } },
          array: [1, 2, 3],
          nullValue: null,
          undefinedValue: undefined,
        },
        description: 'complex props',
      },
    ];

    testCases.forEach(({ props, description }) => {
      it(`should handle ${description}`, async () => {
        const creact = new CReact(config);

        const cloudDOM: CloudDOMNode[] = [
          {
            id: 'resource',
            path: ['resource'],
            construct: class Resource {},
            props,
            children: [],
          },
        ];

        await expect(creact.deploy(cloudDOM, 'test-stack')).resolves.not.toThrow();

        const state = await backendProvider.getState('test-stack');
        expect(state.cloudDOM[0].props).toEqual(props);
      });
    });
  });

  describe('Deploy to various stack names', () => {
    const testCases = [
      { stackName: 'default', description: 'default stack' },
      { stackName: 'production', description: 'production stack' },
      { stackName: 'dev-stack', description: 'stack with hyphen' },
      { stackName: 'dev_stack', description: 'stack with underscore' },
      { stackName: 'stack123', description: 'stack with numbers' },
      { stackName: 'UPPERCASE', description: 'uppercase stack' },
      { stackName: 'MixedCase', description: 'mixed case stack' },
    ];

    testCases.forEach(({ stackName, description }) => {
      it(`should deploy to ${description} (${stackName})`, async () => {
        const creact = new CReact(config);

        const cloudDOM: CloudDOMNode[] = [
          {
            id: 'resource',
            path: ['resource'],
            construct: class Resource {},
            props: {},
            children: [],
          },
        ];

        await creact.deploy(cloudDOM, stackName);

        const state = await backendProvider.getState(stackName);
        expect(state).toBeDefined();
        expect(state.cloudDOM).toEqual(cloudDOM);
      });
    });
  });

  describe('Idempotency with various change scenarios', () => {
    it('should skip deployment when CloudDOM is identical', async () => {
      const creact = new CReact(config);

      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'resource',
          path: ['resource'],
          construct: class Resource {},
          props: { name: 'test' },
          children: [],
        },
      ];

      // First deployment
      await creact.deploy(cloudDOM, 'test-stack');

      // Second deployment with identical CloudDOM
      const consoleSpy = vi.spyOn(console, 'log');
      await creact.deploy(cloudDOM, 'test-stack');

      // Should show no changes (idempotent)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No changes detected'));

      consoleSpy.mockRestore();
    });

    it('should detect when new resources are added', async () => {
      const creact = new CReact(config);

      const cloudDOM1: CloudDOMNode[] = [
        {
          id: 'resource1',
          path: ['resource1'],
          construct: class Resource {},
          props: {},
          children: [],
        },
      ];

      // First deployment
      await creact.deploy(cloudDOM1, 'test-stack');

      // Second deployment with additional resource
      const cloudDOM2: CloudDOMNode[] = [
        ...cloudDOM1,
        {
          id: 'resource2',
          path: ['resource2'],
          construct: class Resource {},
          props: {},
          children: [],
        },
      ];

      const consoleSpy = vi.spyOn(console, 'log');
      await creact.deploy(cloudDOM2, 'test-stack');

      // Should show 1 create
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 creates'));

      consoleSpy.mockRestore();
    });

    it('should detect when resources are removed', async () => {
      const creact = new CReact(config);

      const cloudDOM1: CloudDOMNode[] = [
        {
          id: 'resource1',
          path: ['resource1'],
          construct: class Resource {},
          props: {},
          children: [],
        },
        {
          id: 'resource2',
          path: ['resource2'],
          construct: class Resource {},
          props: {},
          children: [],
        },
      ];

      // First deployment
      await creact.deploy(cloudDOM1, 'test-stack');

      // Second deployment with one resource removed
      const cloudDOM2: CloudDOMNode[] = [cloudDOM1[0]];

      const consoleSpy = vi.spyOn(console, 'log');
      await creact.deploy(cloudDOM2, 'test-stack');

      // Should show 1 delete
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('1 deletes'));

      consoleSpy.mockRestore();
    });
  });

  describe('Config variations', () => {
    const testCases = [
      {
        description: 'minimal config',
        config: (base: CReactConfig) => base,
      },
      {
        description: 'config with migration map',
        config: (base: CReactConfig) => ({
          ...base,
          migrationMap: { 'old.id': 'new.id' },
        }),
      },
      {
        description: 'config with async timeout',
        config: (base: CReactConfig) => ({
          ...base,
          asyncTimeout: 300000,
        }),
      },
      {
        description: 'config with all options',
        config: (base: CReactConfig) => ({
          ...base,
          migrationMap: { 'old.id': 'new.id' },
          asyncTimeout: 300000,
        }),
      },
    ];

    testCases.forEach(({ description, config: configFn }) => {
      it(`should work with ${description}`, async () => {
        const testConfig = configFn(config);
        const creact = new CReact(testConfig);

        const cloudDOM: CloudDOMNode[] = [
          {
            id: 'resource',
            path: ['resource'],
            construct: class Resource {},
            props: {},
            children: [],
          },
        ];

        await expect(creact.deploy(cloudDOM, 'test-stack')).resolves.not.toThrow();
      });
    });
  });
});
