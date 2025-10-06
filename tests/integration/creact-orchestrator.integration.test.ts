// REQ-01, REQ-04, REQ-05, REQ-07, REQ-09: CReact orchestrator integration tests
// Integration tests for the full pipeline: Renderer → Validator → CloudDOMBuilder → Providers

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CReact } from '@/core/CReact';
import { DummyCloudProvider } from '@/providers/DummyCloudProvider';
import { DummyBackendProvider } from '@/providers/DummyBackendProvider';
import { CloudDOMNode, JSXElement } from '@/core/types';
import { extractOutputs } from '../helpers/output-helpers';
import * as fs from 'fs';

describe('CReact Orchestrator - Integration Tests', () => {
  let cloudProvider: DummyCloudProvider;
  let backendProvider: DummyBackendProvider;
  let creact: CReact;

  let testDir: string;

  beforeEach(() => {
    // Instantiate providers
    cloudProvider = new DummyCloudProvider();
    backendProvider = new DummyBackendProvider();

    // Use unique directory per test to avoid cleanup race conditions
    testDir = `.creact-integration-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Inject providers into CReact (dependency injection)
    creact = new CReact({
      cloudProvider,
      backendProvider,
    });
  });

  afterEach(() => {
    // Clean up backend state
    backendProvider.clearAll();
    
    // Clean up test-specific directory
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Build Pipeline Integration', () => {
    it('should build CloudDOM from JSX-like tree with correct hierarchy', async () => {
      // Arrange: Create JSX-like structure (RegistryStack + Service)
      const jsx: JSXElement = {
        type: function RegistryStack({ children }: any) {
          return children;
        },
        props: {
          children: [
            {
              type: function Service() {
                return null;
              },
              props: { name: 'api' },
              key: undefined,
            },
          ],
        },
        key: undefined,
      };

      // Manually attach CloudDOM nodes (simulating useInstance)
      // This will be replaced by actual hooks in Phase 2

      // Act: Build CloudDOM
      const cloudDOM = await creact.build(jsx);

      // Assert: CloudDOM structure
      expect(cloudDOM).toBeDefined();
      expect(Array.isArray(cloudDOM)).toBe(true);

      // Note: Without hooks, CloudDOM will be empty
      // This test validates the pipeline works end-to-end
    });

    it('should inject providers correctly (dependency injection)', () => {
      // Assert: Providers are injected
      expect(creact.getCloudProvider()).toBe(cloudProvider);
      expect(creact.getBackendProvider()).toBe(backendProvider);
    });
  });

  describe('Provider Lifecycle Validation', () => {
    it('should call materialize() on cloud provider during deploy', async () => {
      // Arrange
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test-resource',
          path: ['test-resource'],
          construct: class TestConstruct {},
          props: { name: 'test' },
          children: [],
        },
      ];

      // Spy on materialize
      const materializeSpy = vi.spyOn(cloudProvider, 'materialize');

      // Act
      await creact.deploy(cloudDOM, 'test-stack');

      // Assert: materialize called once with CloudDOM
      expect(materializeSpy).toHaveBeenCalledTimes(1);
      expect(materializeSpy).toHaveBeenCalledWith(cloudDOM, null);

      materializeSpy.mockRestore();
    });

    it('should call saveState() on backend provider after deploy', async () => {
      // Arrange
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test-resource',
          path: ['test-resource'],
          construct: class TestConstruct {},
          props: { name: 'test' },
          children: [],
        },
      ];

      // Spy on saveState
      const saveStateSpy = vi.spyOn(backendProvider, 'saveState');

      // Act
      await creact.deploy(cloudDOM, 'test-stack');

      // Assert: saveState called multiple times (startDeployment, checkpoints, completeDeployment)
      expect(saveStateSpy).toHaveBeenCalled();
      
      // Final call should have DEPLOYED status
      const finalCall = saveStateSpy.mock.calls[saveStateSpy.mock.calls.length - 1];
      expect(finalCall[0]).toBe('test-stack');
      expect(finalCall[1]).toMatchObject({
        status: 'DEPLOYED',
        cloudDOM,
        stackName: 'test-stack',
        timestamp: expect.any(Number),
      });

      saveStateSpy.mockRestore();
    });

    it('should call preDeploy hook before materialization', async () => {
      // Arrange
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test-resource',
          path: ['test-resource'],
          construct: class TestConstruct {},
          props: { name: 'test' },
          children: [],
        },
      ];

      const preDeploySpy = vi.spyOn(cloudProvider, 'preDeploy');
      const materializeSpy = vi.spyOn(cloudProvider, 'materialize');

      // Act
      await creact.deploy(cloudDOM, 'test-stack');

      // Assert: preDeploy called before materialize
      expect(preDeploySpy).toHaveBeenCalledTimes(1);
      expect(preDeploySpy).toHaveBeenCalledWith(cloudDOM);

      // Verify order: preDeploy before materialize
      const preDeployOrder = preDeploySpy.mock.invocationCallOrder[0];
      const materializeOrder = materializeSpy.mock.invocationCallOrder[0];
      expect(preDeployOrder).toBeLessThan(materializeOrder);

      preDeploySpy.mockRestore();
      materializeSpy.mockRestore();
    });

    it('should call postDeploy hook after materialization', async () => {
      // Arrange
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test-resource',
          path: ['test-resource'],
          construct: class TestConstruct {},
          props: { name: 'test' },
          children: [],
          outputs: { endpoint: 'https://test.com' },
        },
      ];

      const postDeploySpy = vi.spyOn(cloudProvider, 'postDeploy');
      const materializeSpy = vi.spyOn(cloudProvider, 'materialize');

      // Act
      await creact.deploy(cloudDOM, 'test-stack');

      // Assert: postDeploy called after materialize
      expect(postDeploySpy).toHaveBeenCalledTimes(1);
      expect(postDeploySpy).toHaveBeenCalledWith(
        cloudDOM,
        expect.objectContaining({
          'test-resource.endpoint': 'https://test.com',
        })
      );

      // Verify order: materialize before postDeploy
      const materializeOrder = materializeSpy.mock.invocationCallOrder[0];
      const postDeployOrder = postDeploySpy.mock.invocationCallOrder[0];
      expect(materializeOrder).toBeLessThan(postDeployOrder);

      postDeploySpy.mockRestore();
      materializeSpy.mockRestore();
    });

    it('should call onError hook when deployment fails', async () => {
      // Arrange
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test-resource',
          path: ['test-resource'],
          construct: class TestConstruct {},
          props: { name: 'test' },
          children: [],
        },
      ];

      // Make materialize throw an error
      const testError = new Error('Deployment failed');
      vi.spyOn(cloudProvider, 'materialize').mockImplementation(() => {
        throw testError;
      });

      const onErrorSpy = vi.spyOn(cloudProvider, 'onError');

      // Act & Assert
      await expect(creact.deploy(cloudDOM, 'test-stack')).rejects.toThrow(
        'Deployment failed'
      );

      // Assert: onError called with error and CloudDOM
      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(testError, cloudDOM);

      onErrorSpy.mockRestore();
    });
  });

  describe('State Persistence Round-Trip', () => {
    it('should save and reload CloudDOM with same structure', async () => {
      // Arrange
      const originalCloudDOM: CloudDOMNode[] = [
        {
          id: 'registry',
          path: ['registry'],
          construct: class Registry {},
          props: { name: 'my-registry' },
          children: [
            {
              id: 'registry.service',
              path: ['registry', 'service'],
              construct: class Service {},
              props: { name: 'api' },
              children: [],
            },
          ],
          outputs: { url: 'https://registry.com' },
        },
      ];

      // Act: Deploy (saves state)
      await creact.deploy(originalCloudDOM, 'test-stack');

      // Reload state from backend
      const savedState = await backendProvider.getState('test-stack');

      // Assert: State structure is correct
      expect(savedState).toBeDefined();
      expect(savedState.status).toBe('DEPLOYED');
      expect(savedState.cloudDOM).toEqual(originalCloudDOM);
      expect(savedState.stackName).toBe('test-stack');
      expect(savedState.timestamp).toBeTypeOf('number');
      
      // Assert: Outputs are in CloudDOM nodes
      const outputs = extractOutputs(savedState.cloudDOM);
      expect(outputs).toEqual({
        'registry.url': 'https://registry.com',
      });
    });
  });

  describe('Idempotent Deployment', () => {
    it('should skip deployment when no changes detected', async () => {
      // Arrange
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test-resource',
          path: ['test-resource'],
          construct: class TestConstruct {},
          props: { name: 'test' },
          children: [],
        },
      ];

      // First deployment
      await creact.deploy(cloudDOM, 'test-stack');

      // Spy on materialize for second deployment
      const materializeSpy = vi.spyOn(cloudProvider, 'materialize');
      const consoleSpy = vi.spyOn(console, 'log');

      // Act: Deploy again with same CloudDOM
      await creact.deploy(cloudDOM, 'test-stack');

      // Assert: Deployment skipped (idempotent)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No changes detected')
      );
      expect(materializeSpy).not.toHaveBeenCalled();

      materializeSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should deploy when changes are detected', async () => {
      // Arrange
      const cloudDOM1: CloudDOMNode[] = [
        {
          id: 'test-resource',
          path: ['test-resource'],
          construct: class TestConstruct {},
          props: { name: 'test-v1' },
          children: [],
        },
      ];

      const cloudDOM2: CloudDOMNode[] = [
        {
          id: 'test-resource',
          path: ['test-resource'],
          construct: class TestConstruct {},
          props: { name: 'test-v2' }, // Changed prop
          children: [],
        },
      ];

      // First deployment
      await creact.deploy(cloudDOM1, 'test-stack');

      // Spy on materialize for second deployment
      const materializeSpy = vi.spyOn(cloudProvider, 'materialize');

      // Act: Deploy with changed CloudDOM
      await creact.deploy(cloudDOM2, 'test-stack');

      // Assert: Deployment executed (changes detected)
      expect(materializeSpy).toHaveBeenCalledTimes(1);
      expect(materializeSpy).toHaveBeenCalledWith(cloudDOM2, null);

      materializeSpy.mockRestore();
    });
  });

  describe('Deterministic Output', () => {
    it('should produce same CloudDOM when built twice', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: { name: 'test' },
        key: undefined,
      };

      // Act: Build twice
      const cloudDOM1 = await creact.build(jsx);
      const cloudDOM2 = await creact.build(jsx);

      // Assert: Same structure (deterministic)
      expect(cloudDOM1).toEqual(cloudDOM2);
      expect(JSON.stringify(cloudDOM1)).toBe(JSON.stringify(cloudDOM2));
    });
  });

  describe('Output Extraction', () => {
    it('should extract outputs from CloudDOM nodes', async () => {
      // Arrange
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'registry',
          path: ['registry'],
          construct: class Registry {},
          props: { name: 'my-registry' },
          children: [
            {
              id: 'registry.service',
              path: ['registry', 'service'],
              construct: class Service {},
              props: { name: 'api' },
              children: [],
              outputs: { endpoint: 'https://api.com' },
            },
          ],
          outputs: { url: 'https://registry.com', arn: 'arn:aws:ecr:...' },
        },
      ];

      // Act: Deploy
      await creact.deploy(cloudDOM, 'test-stack');

      // Get saved state
      const savedState = await backendProvider.getState('test-stack');

      // Assert: Outputs are in CloudDOM nodes
      const outputs = extractOutputs(savedState.cloudDOM);
      expect(outputs).toEqual({
        'registry.url': 'https://registry.com',
        'registry.arn': 'arn:aws:ecr:...',
        'registry.service.endpoint': 'https://api.com',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Arrange: Create invalid JSX that will fail validation
      const invalidJsx: JSXElement = {
        type: function InvalidComponent() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Note: Validation errors will be tested more thoroughly in validator tests
      // This test ensures the pipeline handles errors without crashing

      // Act & Assert: Should not crash
      await expect(creact.build(invalidJsx)).resolves.toBeDefined();
    });

    it('should re-throw errors after calling onError hook', async () => {
      // Arrange
      const cloudDOM: CloudDOMNode[] = [
        {
          id: 'test-resource',
          path: ['test-resource'],
          construct: class TestConstruct {},
          props: { name: 'test' },
          children: [],
        },
      ];

      const testError = new Error('Deployment failed');
      vi.spyOn(cloudProvider, 'materialize').mockImplementation(() => {
        throw testError;
      });

      // Act & Assert: Error is re-thrown
      await expect(creact.deploy(cloudDOM, 'test-stack')).rejects.toThrow(
        'Deployment failed'
      );
    });
  });

  describe('Compare Method (Placeholder)', () => {
    it('should return placeholder diff structure', async () => {
      // Arrange
      const previous: CloudDOMNode[] = [];
      const current: CloudDOMNode[] = [];

      // Act
      const diff = await creact.compare(previous, current);

      // Assert: Full ChangeSet structure from Reconciler
      expect(diff).toEqual({
        creates: [],
        updates: [],
        deletes: [],
        replacements: [],
        moves: [],
        deploymentOrder: [],
        parallelBatches: [],
      });
    });
  });
});
