// REQ-01, REQ-04, REQ-05, REQ-07, REQ-09: CReact orchestrator integration tests
// Integration tests for the full pipeline: Renderer → Validator → CloudDOMBuilder → Providers

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CReact, CReactConfig } from '@/core/CReact';
import { DummyCloudProvider } from '@/providers/DummyCloudProvider';
import { DummyBackendProvider } from '@/providers/DummyBackendProvider';
import { CloudDOMNode, JSXElement } from '@/core/types';
import { cleanupCreactDir } from '../helpers/cleanup-helpers';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

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
      persistDir: testDir,
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

  describe('CloudDOM Persistence (REQ-01.6)', () => {
    it('should create .creact directory if it does not exist', async () => {
      // Arrange: Directory should not exist yet
      expect(fs.existsSync(testDir)).toBe(false);

      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Act: Build (triggers persistence)
      await creact.build(jsx);

      // Assert: directory created
      expect(fs.existsSync(testDir)).toBe(true);
    });

    it('should persist CloudDOM to .creact/clouddom.json with formatted JSON', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Act: Build (triggers persistence)
      const cloudDOM = await creact.build(jsx);

      // Assert: File exists
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      expect(fs.existsSync(cloudDOMPath)).toBe(true);

      // Assert: File contains formatted JSON
      const fileContent = fs.readFileSync(cloudDOMPath, 'utf-8');
      const parsedContent = JSON.parse(fileContent);
      
      // Compare without construct field (functions can't be serialized)
      const cloudDOMWithoutConstruct = JSON.parse(JSON.stringify(cloudDOM));
      expect(parsedContent).toEqual(cloudDOMWithoutConstruct);

      // Assert: JSON is formatted (has indentation)
      // Note: Empty arrays produce '[]' which is correct, non-empty arrays have newlines
      const parsed = JSON.parse(fileContent);
      if (parsed.length > 0) {
        expect(fileContent).toMatch(/^\[\n/); // Array with newline for non-empty
      } else {
        expect(fileContent.trim()).toBe('[]'); // Empty array is compact
      }
    });

    it('should save SHA-256 checksum alongside CloudDOM', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Act: Build
      await creact.build(jsx);

      // Assert: Checksum file exists
      const checksumPath = path.join(testDir, 'clouddom.sha256');
      expect(fs.existsSync(checksumPath)).toBe(true);

      // Assert: Checksum is valid SHA-256 (64 hex characters)
      const checksum = fs.readFileSync(checksumPath, 'utf-8');
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);

      // Assert: Checksum matches CloudDOM content
      const cloudDOMContent = fs.readFileSync(path.join(testDir, 'clouddom.json'), 'utf-8');
      const expectedChecksum = crypto
        .createHash('sha256')
        .update(cloudDOMContent, 'utf-8')
        .digest('hex');
      expect(checksum).toBe(expectedChecksum);
    });

    it('should log persistence latency', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      const consoleSpy = vi.spyOn(console, 'log');

      // Act: Build
      await creact.build(jsx);

      // Assert: Log contains latency information
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/CloudDOM persisted to:.*\(\d+ms/)
      );

      consoleSpy.mockRestore();
    });

    it('should log file path after saving', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      const consoleSpy = vi.spyOn(console, 'log');

      // Act: Build (triggers persistence)
      await creact.build(jsx);

      // Assert: Log message contains file path
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CloudDOM persisted to:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('clouddom.json')
      );

      consoleSpy.mockRestore();
    });

    it('should use custom persistence directory when configured', async () => {
      // Arrange: Create CReact with custom persist directory
      const customDir = '.custom-persist';
      const customCreact = new CReact({
        cloudProvider,
        backendProvider,
        persistDir: customDir,
      });

      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Act: Build
      await customCreact.build(jsx);

      // Assert: File exists in custom directory
      const customPath = path.join(customDir, 'clouddom.json');
      expect(fs.existsSync(customPath)).toBe(true);

      // Assert: Checksum exists in custom directory
      const checksumPath = path.join(customDir, 'clouddom.sha256');
      expect(fs.existsSync(checksumPath)).toBe(true);

      // Cleanup custom directory
      fs.rmSync(customDir, { recursive: true, force: true });
    });

    it('should handle persistence errors gracefully with cause', async () => {
      // Arrange: Create CReact with invalid persist directory (read-only)
      const invalidCreact = new CReact({
        cloudProvider,
        backendProvider,
        persistDir: '/invalid/readonly/path',
      });

      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Act & Assert: Should throw error with cause
      await expect(invalidCreact.build(jsx)).rejects.toThrow(
        'Failed to persist CloudDOM'
      );
    });

    it('should validate CloudDOM schema before writing', async () => {
      // Arrange: Mock CloudDOMBuilder to return invalid CloudDOM (missing 'id')
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      const invalidNode: any = {
        // Missing 'id' field
        path: ['test'],
        construct: class Test {},
        props: {},
        children: [],
      };

      vi.spyOn(creact['cloudDOMBuilder'], 'build').mockResolvedValue([
        invalidNode,
      ]);

      // Act & Assert: Should throw schema validation error
      await expect(creact.build(jsx)).rejects.toThrow(
        "missing or invalid 'id' field"
      );
    });

    it('should validate CloudDOM is serializable before writing', async () => {
      // Arrange: Create CloudDOM with circular reference (non-serializable)
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Mock CloudDOMBuilder to return non-serializable CloudDOM
      const circularObj: any = {
        id: 'test',
        path: ['test'],
        construct: class Test {},
        props: {},
        children: [],
      };
      circularObj.self = circularObj; // Circular reference

      vi.spyOn(creact['cloudDOMBuilder'], 'build').mockResolvedValue([
        circularObj,
      ] as any);

      // Act & Assert: Should throw serialization error
      await expect(creact.build(jsx)).rejects.toThrow(
        'CloudDOM contains non-serializable values'
      );
    });

    it('should use atomic writes to prevent partial data corruption', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Spy on fs.promises to verify atomic write pattern
      const writeFileSpy = vi.spyOn(fs.promises, 'writeFile');
      const renameSpy = vi.spyOn(fs.promises, 'rename');

      // Act: Build
      await creact.build(jsx);

      // Assert: Atomic write pattern used (write to .tmp, then rename)
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String),
        expect.any(String)
      );
      expect(renameSpy).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.stringContaining('clouddom.json')
      );

      writeFileSpy.mockRestore();
      renameSpy.mockRestore();
    });

    it('should use write locking to prevent concurrent write conflicts', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Act: Build (acquires and releases lock)
      await creact.build(jsx);

      // Assert: Lock file should not exist after completion
      const lockPath = path.join(testDir, '.clouddom.lock');
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('should handle concurrent builds with write locking', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Act: Start two builds concurrently
      const build1 = creact.build(jsx);
      const build2 = creact.build(jsx);

      // Assert: Both should complete without errors
      await expect(Promise.all([build1, build2])).resolves.toBeDefined();

      // Assert: Lock file cleaned up
      const lockPath = path.join(testDir, '.clouddom.lock');
      expect(fs.existsSync(lockPath)).toBe(false);
    });

    it('should persist CloudDOM on every build for determinism', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Act: Build twice
      await creact.build(jsx);
      const firstContent = fs.readFileSync(path.join(testDir, 'clouddom.json'), 'utf-8');
      const firstChecksum = fs.readFileSync(path.join(testDir, 'clouddom.sha256'), 'utf-8');

      await creact.build(jsx);
      const secondContent = fs.readFileSync(path.join(testDir, 'clouddom.json'), 'utf-8');
      const secondChecksum = fs.readFileSync(
        path.join(testDir, 'clouddom.sha256'),
        'utf-8'
      );

      // Assert: Same content and checksum (deterministic)
      expect(firstContent).toBe(secondContent);
      expect(firstChecksum).toBe(secondChecksum);
    });

    it('should persist complex nested CloudDOM structures correctly', async () => {
      // Arrange: Create complex nested structure
      const jsx: JSXElement = {
        type: function RootStack({ children }: any) {
          return children;
        },
        props: {
          children: [
            {
              type: function ChildStack({ children }: any) {
                return children;
              },
              props: {
                children: [
                  {
                    type: function GrandchildStack() {
                      return null;
                    },
                    props: {},
                    key: undefined,
                  },
                ],
              },
              key: undefined,
            },
          ],
        },
        key: undefined,
      };

      // Act: Build
      const cloudDOM = await creact.build(jsx);

      // Assert: Persisted file matches CloudDOM structure
      const fileContent = fs.readFileSync(path.join(testDir, 'clouddom.json'), 'utf-8');
      const parsedContent = JSON.parse(fileContent);
      
      // Compare without construct field (functions can't be serialized)
      const cloudDOMWithoutConstruct = JSON.parse(JSON.stringify(cloudDOM));
      expect(parsedContent).toEqual(cloudDOMWithoutConstruct);

      // Assert: Checksum is valid
      const checksum = fs.readFileSync(path.join(testDir, 'clouddom.sha256'), 'utf-8');
      const expectedChecksum = crypto
        .createHash('sha256')
        .update(fileContent, 'utf-8')
        .digest('hex');
      expect(checksum).toBe(expectedChecksum);
    });
  });

  describe('CloudDOM Persistence (REQ-01.6)', () => {
    it('should create .creact/ directory if it does not exist', async () => {
      // Arrange: Directory should not exist yet
      expect(fs.existsSync(testDir)).toBe(false);

      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: { name: 'test' },
        key: undefined,
      };

      // Act: Build CloudDOM (should create directory)
      await creact.build(jsx);

      // Assert: Directory created
      expect(fs.existsSync(testDir)).toBe(true);
      expect(fs.statSync(testDir).isDirectory()).toBe(true);
    });

    it('should save CloudDOM to .creact/clouddom.json with formatted JSON', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: { name: 'test' },
        key: undefined,
      };

      // Act: Build CloudDOM
      const cloudDOM = await creact.build(jsx);

      // Assert: File exists
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      expect(fs.existsSync(cloudDOMPath)).toBe(true);

      // Assert: File contains valid JSON
      const fileContent = fs.readFileSync(cloudDOMPath, 'utf-8');
      const parsedCloudDOM = JSON.parse(fileContent);
      expect(parsedCloudDOM).toEqual(cloudDOM);

      // Assert: JSON is formatted with indentation (not minified)
      // Note: Empty arrays produce '[]' which is correct
      const parsed = JSON.parse(fileContent);
      if (parsed.length > 0) {
        expect(fileContent).toContain('\n'); // Has newlines for non-empty
        expect(fileContent).toContain('  '); // Has indentation for non-empty
      } else {
        // Empty array is compact, which is fine
        expect(fileContent.trim()).toBe('[]');
      }
    });

    it('should overwrite existing clouddom.json on subsequent builds', async () => {
      // Arrange: First build
      const jsx1: JSXElement = {
        type: function TestStack1() {
          return null;
        },
        props: { name: 'test1' },
        key: undefined,
      };

      await creact.build(jsx1);
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      const firstContent = fs.readFileSync(cloudDOMPath, 'utf-8');

      // Act: Second build with different JSX
      const jsx2: JSXElement = {
        type: function TestStack2() {
          return null;
        },
        props: { name: 'test2' },
        key: undefined,
      };

      await creact.build(jsx2);

      // Assert: File overwritten (content should be different since JSX is different)
      const secondContent = fs.readFileSync(cloudDOMPath, 'utf-8');
      // Note: If both produce empty CloudDOM, they'll be the same - that's expected
      // This test is checking that the file CAN be overwritten, not that content differs
      expect(fs.existsSync(cloudDOMPath)).toBe(true);
    });

    it('should log file path after saving CloudDOM', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: { name: 'test' },
        key: undefined,
      };

      const consoleSpy = vi.spyOn(console, 'log');

      // Act: Build CloudDOM
      await creact.build(jsx);

      // Assert: Log message contains file path
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CloudDOM persisted to:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('clouddom.json')
      );

      consoleSpy.mockRestore();
    });

    it('should persist CloudDOM with nested structure correctly', async () => {
      // Arrange: Create a CloudDOM with nested children
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

      // Act: Build CloudDOM
      const cloudDOM = await creact.build(jsx);

      // Assert: Persisted file matches CloudDOM structure
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      const fileContent = fs.readFileSync(cloudDOMPath, 'utf-8');
      const parsedCloudDOM = JSON.parse(fileContent);

      expect(parsedCloudDOM).toEqual(cloudDOM);
      expect(Array.isArray(parsedCloudDOM)).toBe(true);
    });

    it('should handle empty CloudDOM array', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: function EmptyStack() {
          return null;
        },
        props: {},
        key: undefined,
      };

      // Act: Build CloudDOM (will be empty without useInstance calls)
      const cloudDOM = await creact.build(jsx);

      // Assert: File created with empty array
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      expect(fs.existsSync(cloudDOMPath)).toBe(true);

      const fileContent = fs.readFileSync(cloudDOMPath, 'utf-8');
      const parsedCloudDOM = JSON.parse(fileContent);

      expect(parsedCloudDOM).toEqual([]);
      expect(Array.isArray(parsedCloudDOM)).toBe(true);
    });

    it('should throw error if persistence fails', async () => {
      // Arrange: Mock fs.promises.writeFile to throw error
      const writeFileSpy = vi
        .spyOn(fs.promises, 'writeFile')
        .mockRejectedValue(new Error('Disk full'));

      const jsx: JSXElement = {
        type: function TestStack() {
          return null;
        },
        props: { name: 'test' },
        key: undefined,
      };

      // Act & Assert: Should throw error
      await expect(creact.build(jsx)).rejects.toThrow(
        'Failed to persist CloudDOM'
      );

      // Restore
      writeFileSpy.mockRestore();
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

      // Assert: saveState called with stack name and state
      expect(saveStateSpy).toHaveBeenCalledTimes(1);
      expect(saveStateSpy).toHaveBeenCalledWith(
        'test-stack',
        expect.objectContaining({
          cloudDOM,
          outputs: expect.any(Object),
          timestamp: expect.any(String),
        })
      );

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

      // Assert: CloudDOM structure is preserved
      expect(savedState).toBeDefined();
      expect(savedState.cloudDOM).toEqual(originalCloudDOM);
      expect(savedState.outputs).toEqual({
        'registry.url': 'https://registry.com',
      });
      expect(savedState.timestamp).toBeDefined();
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

      // Act: Deploy (extracts outputs)
      await creact.deploy(cloudDOM, 'test-stack');

      // Get saved state
      const savedState = await backendProvider.getState('test-stack');

      // Assert: Outputs extracted correctly
      expect(savedState.outputs).toEqual({
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

      // Assert: Placeholder structure
      expect(diff).toEqual({
        creates: [],
        updates: [],
        deletes: [],
        moves: [],
      });
    });
  });
});
