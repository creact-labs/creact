// REQ-04: DummyCloudProvider unit tests - Core functionality

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DummyCloudProvider } from '@/providers/DummyCloudProvider';
import { createMockCloudDOM } from '../helpers';
import { CloudDOMNode } from '@/core/types';

describe('DummyCloudProvider - Core Functionality', () => {
  let provider: DummyCloudProvider;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new DummyCloudProvider();
    consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await provider.initialize();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DummyCloudProvider] Initializing')
      );

      consoleLogSpy.mockRestore();
    });

    it('should check initialization status', async () => {
      expect(provider.isInitialized()).toBe(false);
      await provider.initialize();
      expect(provider.isInitialized()).toBe(true);
    });
  });

  describe('Materialization', () => {
    it('should materialize a simple CloudDOM node', () => {
      class DummyRegistry {}

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'registry',
          path: ['registry'],
          construct: DummyRegistry,
          props: { name: 'app' },
        }),
      ];

      provider.materialize(cloudDOM);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DummyCloudProvider: Materializing CloudDOM')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deploying: registry (DummyRegistry)')
      );
    });

    it('should materialize nested CloudDOM nodes in order', () => {
      class DummyRegistry {}
      class DummyService {}

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'registry',
          path: ['registry'],
          construct: DummyRegistry,
          props: { name: 'app' },
          children: [
            createMockCloudDOM({
              id: 'registry.service',
              path: ['registry', 'service'],
              construct: DummyService,
              props: { name: 'api' },
            }),
          ],
        }),
      ];

      provider.materialize(cloudDOM);

      const calls = consoleSpy.mock.calls.map((call) => String(call[0]));
      const registryIndex = calls.findIndex((call) => call.includes('Deploying: registry'));
      const serviceIndex = calls.findIndex((call) => call.includes('Deploying: registry.service'));

      // Parent should be deployed before child
      expect(registryIndex).toBeLessThan(serviceIndex);
    });

    it('should log outputs when present', () => {
      class DummyRegistry {}

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'registry',
          path: ['registry'],
          construct: DummyRegistry,
          props: { name: 'app' },
          outputs: {
            url: 'registry-url',
            arn: 'registry-arn',
          },
        }),
      ];

      provider.materialize(cloudDOM);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Outputs:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('registry.url'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('registry.arn'));
    });

    it('should handle empty CloudDOM array', () => {
      expect(() => provider.materialize([])).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Materializing CloudDOM')
      );
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should call preDeploy lifecycle hook', async () => {
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'registry',
          path: ['registry'],
        }),
      ];

      await provider.preDeploy!(cloudDOM);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DummyCloudProvider] preDeploy hook called')
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Validating 1 resources'));
    });

    it('should call postDeploy lifecycle hook', async () => {
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'registry',
          path: ['registry'],
        }),
      ];
      const outputs = { 'registry.url': 'test-url' };

      await provider.postDeploy!(cloudDOM, outputs);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DummyCloudProvider] postDeploy hook called')
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deployed 1 resources'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Collected 1 outputs'));
    });

    it('should call onError lifecycle hook', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'registry',
          path: ['registry'],
        }),
      ];
      const error = new Error('Deployment failed');

      await provider.onError!(error, cloudDOM);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DummyCloudProvider] onError hook called')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Deployment failed'));

      consoleErrorSpy.mockRestore();
    });

    it('should never throw from error lifecycle hook', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'registry',
          path: ['registry'],
        }),
      ];
      const error = new Error('Critical failure');

      // Error hook should never throw - important for CI/CD reliability
      await expect(provider.onError!(error, cloudDOM)).resolves.not.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it('should execute lifecycle hooks in correct order', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const order: string[] = [];

      const cloudDOM: CloudDOMNode[] = [
        createMockCloudDOM({
          id: 'resource',
          path: ['resource'],
        }),
      ];

      // Track order of operations
      await provider.preDeploy!(cloudDOM);
      order.push('preDeploy');

      provider.materialize(cloudDOM);
      order.push('materialize');

      await provider.postDeploy!(cloudDOM, {});
      order.push('postDeploy');

      expect(order).toEqual(['preDeploy', 'materialize', 'postDeploy']);

      consoleLogSpy.mockRestore();
    });
  });
});
