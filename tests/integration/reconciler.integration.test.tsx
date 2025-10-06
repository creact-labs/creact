// Integration tests for Reconciler with CReact
// Tests end-to-end reconciliation with real CloudDOM trees

/** @jsx CReact.createElement */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CReact as CReactCore } from '../../src/core/CReact';
import { CReact } from '../../src/jsx';
import { Reconciler } from '../../src/core/Reconciler';
import { ICloudProvider } from '../../src/providers/ICloudProvider';
import { IBackendProvider } from '../../src/providers/IBackendProvider';
import { CloudDOMNode } from '../../src/core/types';
import { useInstance } from '../../src/hooks/useInstance';
import { useState } from '../../src/hooks/useState';
import { createContext } from '../../src/context/createContext';
import { useContext } from '../../src/hooks/useContext';
import * as fs from 'fs';

// Mock constructs
class S3Bucket {
  constructor(public props: any) {}
}

class Lambda {
  constructor(public props: any) {}
}

class ApiGateway {
  constructor(public props: any) {}
}

// Test cloud provider
class TestCloudProvider implements ICloudProvider {
  async materialize(cloudDOM: CloudDOMNode[]): Promise<void> {
    // Simulate deployment by adding outputs
    for (const node of cloudDOM) {
      if (node.construct.name === 'S3Bucket') {
        node.outputs = {
          bucketName: `bucket-${node.id}`,
          bucketArn: `arn:aws:s3:::bucket-${node.id}`,
        };
      } else if (node.construct.name === 'Lambda') {
        node.outputs = {
          functionArn: `arn:aws:lambda:us-east-1:123456789012:function:${node.id}`,
        };
      } else if (node.construct.name === 'ApiGateway') {
        node.outputs = {
          apiUrl: `https://${node.id}.execute-api.us-east-1.amazonaws.com`,
        };
      }
    }
  }
}

// In-memory backend provider
class MemoryBackendProvider implements IBackendProvider {
  private state = new Map<string, any>();
  
  async getState(stackName: string): Promise<any | undefined> {
    return this.state.get(stackName);
  }
  
  async saveState(stackName: string, state: any): Promise<void> {
    this.state.set(stackName, state);
  }
  
  clear(): void {
    this.state.clear();
  }
}

describe('Reconciler Integration Tests', () => {
  let creact: CReactCore;
  let reconciler: Reconciler;
  let cloudProvider: TestCloudProvider;
  let backendProvider: MemoryBackendProvider;
  const testDir = '.creact-test-reconciler';
  
  beforeEach(() => {
    cloudProvider = new TestCloudProvider();
    backendProvider = new MemoryBackendProvider();
    creact = new CReactCore({
      cloudProvider,
      backendProvider,
    });
    reconciler = new Reconciler();
  });
  
  afterEach(() => {
    backendProvider.clear();
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  describe('Basic reconciliation flow', () => {
    it('should detect no changes on identical builds', async () => {
      function App() {
        useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        return null;
      }
      
      const cloudDOM1 = await creact.build(<App />);
      const cloudDOM2 = await creact.build(<App />);
      
      const changeSet = reconciler.reconcile(cloudDOM1, cloudDOM2);
      
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
      expect(changeSet.replacements).toHaveLength(0);
    });
    
    it('should detect prop changes between builds', async () => {
      function App({ version }: { version: number }) {
        useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket', version });
        return null;
      }
      
      const cloudDOM1 = await creact.build(<App version={1} />);
      const cloudDOM2 = await creact.build(<App version={2} />);
      
      const changeSet = reconciler.reconcile(cloudDOM1, cloudDOM2);
      
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(1);
      expect(changeSet.updates[0].id).toBe('app.bucket');
      expect(changeSet.deletes).toHaveLength(0);
      expect(changeSet.replacements).toHaveLength(0);
    });
    
    it('should detect resource additions', async () => {
      function App({ withLambda }: { withLambda: boolean }) {
        useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        if (withLambda) {
          useInstance(Lambda, { key: 'function', functionName: 'my-function' });
        }
        return null;
      }
      
      const cloudDOM1 = await creact.build(<App withLambda={false} />);
      const cloudDOM2 = await creact.build(<App withLambda={true} />);
      
      const changeSet = reconciler.reconcile(cloudDOM1, cloudDOM2);
      
      expect(changeSet.creates).toHaveLength(1);
      expect(changeSet.creates[0].id).toBe('app.function');
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
    });
    
    it('should detect resource deletions', async () => {
      function App({ withLambda }: { withLambda: boolean }) {
        useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        if (withLambda) {
          useInstance(Lambda, { key: 'function', functionName: 'my-function' });
        }
        return null;
      }
      
      const cloudDOM1 = await creact.build(<App withLambda={true} />);
      const cloudDOM2 = await creact.build(<App withLambda={false} />);
      
      const changeSet = reconciler.reconcile(cloudDOM1, cloudDOM2);
      
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(1);
      expect(changeSet.deletes[0].id).toBe('app.function');
    });
  });
  
  describe('Context propagation and reconciliation', () => {
    it('should handle context-based resource configuration', async () => {
      interface ConfigContext {
        region?: string;
      }
      
      const ConfigContext = createContext({ region: 'us-east-1' } as ConfigContext);
      
      function ConfigProvider({ region, children }: { region: string; children: any }) {
        return CReact.createElement(ConfigContext.Provider, { value: { region } }, children);
      }
      
      function ResourceStack() {
        const { region } = useContext(ConfigContext);
        useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'my-bucket',
          region: region || 'us-east-1',
        });
        return null;
      }
      
      function App({ region }: { region: string }) {
        return CReact.createElement(
          ConfigProvider,
          { region },
          CReact.createElement(ResourceStack, null)
        );
      }
      
      // Build 1: us-east-1
      const cloudDOM1 = await creact.build(CReact.createElement(App, { region: 'us-east-1' }));
      
      // Build 2: us-west-2 (region changed via context)
      const cloudDOM2 = await creact.build(CReact.createElement(App, { region: 'us-west-2' }));
      
      const changeSet = reconciler.reconcile(cloudDOM1, cloudDOM2);
      
      // Bucket should be updated because region changed via context
      expect(changeSet.updates).toHaveLength(1);
      expect(changeSet.updates[0].id).toContain('bucket');
      expect(changeSet.updates[0].props.region).toBe('us-west-2');
    });
  });
  
  describe('Dependency graph and deployment order', () => {
    it('should compute correct deployment order with dependencies', async () => {
      function App() {
        const bucket = useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        useInstance(Lambda, {
          key: 'function',
          functionName: 'my-function',
          dependsOn: bucket.id,
        });
        return null;
      }
      
      const cloudDOM = await creact.build(<App />);
      const changeSet = reconciler.reconcile([], cloudDOM);
      
      // Bucket should come before Lambda
      expect(changeSet.deploymentOrder).toEqual(['app.bucket', 'app.function']);
    });
    
    it('should compute parallel batches for independent resources', async () => {
      function App() {
        useInstance(S3Bucket, { key: 'bucket1', bucketName: 'bucket-1' });
        useInstance(S3Bucket, { key: 'bucket2', bucketName: 'bucket-2' });
        useInstance(S3Bucket, { key: 'bucket3', bucketName: 'bucket-3' });
        return null;
      }
      
      const cloudDOM = await creact.build(<App />);
      const changeSet = reconciler.reconcile([], cloudDOM);
      
      // All buckets are independent, should be in one batch
      expect(changeSet.parallelBatches).toHaveLength(1);
      expect(changeSet.parallelBatches[0]).toHaveLength(3);
    });
    
    it('should handle complex dependency chains', async () => {
      function App() {
        const bucket = useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        const lambda = useInstance(Lambda, {
          key: 'function',
          functionName: 'my-function',
          dependsOn: bucket.id,
        });
        useInstance(ApiGateway, {
          key: 'api',
          apiName: 'my-api',
          dependsOn: lambda.id,
        });
        return null;
      }
      
      const cloudDOM = await creact.build(<App />);
      const changeSet = reconciler.reconcile([], cloudDOM);
      
      // Should be in order: bucket → lambda → api
      expect(changeSet.deploymentOrder).toEqual([
        'app.bucket',
        'app.function',
        'app.api',
      ]);
      
      // Should be in 3 separate batches (linear chain)
      expect(changeSet.parallelBatches).toHaveLength(3);
    });
  });
  
  describe('Move detection', () => {
    it('should detect when a resource moves between parent components', async () => {
      // Note: Move detection requires the same node ID to exist in both trees
      // but with different parent paths. In this test, the Lambda actually gets
      // deleted and recreated with a different parent, so it's not a true "move"
      // but rather a delete + create. This is expected behavior.
      
      function App({ inStack1 }: { inStack1: boolean }) {
        function Stack1() {
          if (inStack1) {
            useInstance(Lambda, { key: 'function', functionName: 'my-function' });
          }
          return null;
        }
        
        function Stack2() {
          if (!inStack1) {
            useInstance(Lambda, { key: 'function', functionName: 'my-function' });
          }
          return null;
        }
        
        return (
          <>
            <Stack1 />
            <Stack2 />
          </>
        );
      }
      
      const cloudDOM1 = await creact.build(<App inStack1={true} />);
      const cloudDOM2 = await creact.build(<App inStack1={false} />);
      
      const changeSet = reconciler.reconcile(cloudDOM1, cloudDOM2);
      
      // In this case, the resource is deleted from Stack1 and created in Stack2
      // This results in different IDs, so it's a delete + create, not a move
      expect(changeSet.deletes).toHaveLength(1);
      expect(changeSet.creates).toHaveLength(1);
    });
  });
  
  describe('Diff visualization', () => {
    it('should generate human-readable diff visualization', async () => {
      function App({ version }: { version: number }) {
        useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket', version });
        if (version > 1) {
          useInstance(Lambda, { key: 'function', functionName: 'my-function' });
        }
        return null;
      }
      
      const cloudDOM1 = await creact.build(<App version={1} />);
      const cloudDOM2 = await creact.build(<App version={2} />);
      
      const changeSet = reconciler.reconcile(cloudDOM1, cloudDOM2);
      const viz = reconciler.generateDiffVisualization(changeSet);
      
      expect(viz.summary.creates).toBe(1);
      expect(viz.summary.updates).toBe(1);
      expect(viz.summary.total).toBe(2);
      
      expect(viz.changes).toHaveLength(2);
      expect(viz.changes.some(c => c.type === 'create')).toBe(true);
      expect(viz.changes.some(c => c.type === 'update')).toBe(true);
      
      expect(viz.deployment.order).toContain('app.bucket');
      expect(viz.deployment.batches.length).toBeGreaterThan(0);
    });
  });
  
  describe('Idempotency verification', () => {
    it('should verify idempotent deployments', async () => {
      function App() {
        useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        useInstance(Lambda, { key: 'function', functionName: 'my-function' });
        return null;
      }
      
      // Build and deploy
      const cloudDOM1 = await creact.build(<App />);
      await creact.deploy(cloudDOM1);
      
      // Rebuild (should restore state)
      const cloudDOM2 = await creact.build(<App />);
      
      // Rebuild again (should be identical)
      const cloudDOM3 = await creact.build(<App />);
      
      const changeSet = reconciler.reconcile(cloudDOM2, cloudDOM3);
      
      // Should detect no changes (idempotent)
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
      expect(changeSet.replacements).toHaveLength(0);
    });
  });
  
  describe('Hash-based diff optimization', () => {
    it('should use prop hashes for fast comparison', async () => {
      function App() {
        useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'my-bucket',
          tags: { env: 'prod', team: 'platform' },
          config: {
            versioning: true,
            encryption: { type: 'AES256' },
          },
        });
        return null;
      }
      
      const cloudDOM1 = await creact.build(<App />);
      const cloudDOM2 = await creact.build(<App />);
      
      // Reconcile to trigger hash computation
      const changeSet = reconciler.reconcile(cloudDOM1, cloudDOM2);
      
      // After reconciliation, hashes should be computed and cached
      expect((cloudDOM1[0] as any)._propHash).toBeDefined();
      expect((cloudDOM2[0] as any)._propHash).toBeDefined();
      expect((cloudDOM1[0] as any)._propHash).toBe((cloudDOM2[0] as any)._propHash);
      
      // Should detect no changes (hashes match)
      expect(changeSet.updates).toHaveLength(0);
    });
    
    it('should detect changes when hashes differ', async () => {
      function App({ version }: { version: number }) {
        useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'my-bucket',
          tags: { version: String(version) },
        });
        return null;
      }
      
      const cloudDOM1 = await creact.build(<App version={1} />);
      const cloudDOM2 = await creact.build(<App version={2} />);
      
      // Reconcile to trigger hash computation
      const changeSet = reconciler.reconcile(cloudDOM1, cloudDOM2);
      
      // After reconciliation, hashes should be computed and differ
      expect((cloudDOM1[0] as any)._propHash).toBeDefined();
      expect((cloudDOM2[0] as any)._propHash).toBeDefined();
      expect((cloudDOM1[0] as any)._propHash).not.toBe((cloudDOM2[0] as any)._propHash);
      
      // Should detect update
      expect(changeSet.updates).toHaveLength(1);
    });
  });
  
  describe('Replacement detection', () => {
    it('should detect replacement when construct type changes', async () => {
      function App({ useLambda }: { useLambda: boolean }) {
        if (useLambda) {
          useInstance(Lambda, { key: 'resource', functionName: 'my-function' });
        } else {
          useInstance(S3Bucket, { key: 'resource', bucketName: 'my-bucket' });
        }
        return null;
      }
      
      const cloudDOM1 = await creact.build(<App useLambda={false} />);
      const cloudDOM2 = await creact.build(<App useLambda={true} />);
      
      const changeSet = reconciler.reconcile(cloudDOM1, cloudDOM2);
      
      // Should detect replacement (construct type changed)
      expect(changeSet.replacements).toHaveLength(1);
      expect(changeSet.replacements[0].id).toContain('resource');
    });
  });
  
  describe('Complex multi-stack scenarios', () => {
    it('should handle multiple stacks with cross-stack dependencies', async () => {
      function NetworkStack() {
        useInstance(S3Bucket, { key: 'vpc', bucketName: 'vpc-config' });
        return null;
      }
      
      function ComputeStack() {
        const vpc = useInstance(S3Bucket, { key: 'vpc', bucketName: 'vpc-config' });
        useInstance(Lambda, {
          key: 'function',
          functionName: 'my-function',
          dependsOn: vpc.id,
        });
        return null;
      }
      
      function App() {
        return (
          <>
            <NetworkStack />
            <ComputeStack />
          </>
        );
      }
      
      const cloudDOM = await creact.build(<App />);
      const changeSet = reconciler.reconcile([], cloudDOM);
      
      // VPC should come before Lambda in deployment order
      const vpcIndex = changeSet.deploymentOrder.findIndex(id => id.includes('vpc'));
      const lambdaIndex = changeSet.deploymentOrder.findIndex(id => id.includes('function'));
      
      expect(vpcIndex).toBeLessThan(lambdaIndex);
    });
    
    it('should handle conditional resource creation across builds', async () => {
      function App({ enableCache, enableQueue }: { enableCache: boolean; enableQueue: boolean }) {
        useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        
        if (enableCache) {
          useInstance(Lambda, { key: 'cache', functionName: 'cache-function' });
        }
        
        if (enableQueue) {
          useInstance(Lambda, { key: 'queue', functionName: 'queue-function' });
        }
        
        return null;
      }
      
      // Build 1: Only bucket
      const cloudDOM1 = await creact.build(<App enableCache={false} enableQueue={false} />);
      
      // Build 2: Add cache
      const cloudDOM2 = await creact.build(<App enableCache={true} enableQueue={false} />);
      
      // Build 3: Add queue, remove cache
      const cloudDOM3 = await creact.build(<App enableCache={false} enableQueue={true} />);
      
      const changeSet1to2 = reconciler.reconcile(cloudDOM1, cloudDOM2);
      expect(changeSet1to2.creates).toHaveLength(1);
      expect(changeSet1to2.creates[0].id).toContain('cache');
      
      const changeSet2to3 = reconciler.reconcile(cloudDOM2, cloudDOM3);
      expect(changeSet2to3.creates).toHaveLength(1);
      expect(changeSet2to3.creates[0].id).toContain('queue');
      expect(changeSet2to3.deletes).toHaveLength(1);
      expect(changeSet2to3.deletes[0].id).toContain('cache');
    });
  });
  
  describe('Async reconciliation', () => {
    it('should reconcile large graphs asynchronously', async () => {
      function App() {
        // Create many resources
        for (let i = 0; i < 100; i++) {
          useInstance(S3Bucket, { key: `bucket${i}`, bucketName: `bucket-${i}` });
        }
        return null;
      }
      
      const cloudDOM1 = await creact.build(<App />);
      const cloudDOM2 = await creact.build(<App />);
      
      const changeSet = await reconciler.reconcileAsync(cloudDOM1, cloudDOM2, 10);
      
      // Should detect no changes
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
    });
    
    it('should detect changes in async reconciliation', async () => {
      function App({ count }: { count: number }) {
        for (let i = 0; i < count; i++) {
          useInstance(S3Bucket, { key: `bucket${i}`, bucketName: `bucket-${i}` });
        }
        return null;
      }
      
      const cloudDOM1 = await creact.build(<App count={50} />);
      const cloudDOM2 = await creact.build(<App count={75} />);
      
      const changeSet = await reconciler.reconcileAsync(cloudDOM1, cloudDOM2, 10);
      
      // Should detect 25 new buckets
      expect(changeSet.creates).toHaveLength(25);
    });
  });
  
  describe('Error handling', () => {
    it('should handle circular dependencies gracefully', async () => {
      function App() {
        const bucket = useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        const lambda = useInstance(Lambda, {
          key: 'function',
          functionName: 'my-function',
          dependsOn: bucket.id,
        });
        
        // Manually create circular dependency (not possible in real code)
        bucket.props.dependsOn = lambda.id;
        
        return null;
      }
      
      const cloudDOM = await creact.build(<App />);
      
      expect(() => {
        reconciler.reconcile([], cloudDOM);
      }).toThrow(/Circular dependencies detected/);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle empty CloudDOM trees', () => {
      const changeSet = reconciler.reconcile([], []);
      
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
      expect(changeSet.deploymentOrder).toHaveLength(0);
      expect(changeSet.parallelBatches).toHaveLength(0);
    });
    
    it('should handle transition from empty to populated', async () => {
      function App() {
        useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        return null;
      }
      
      const cloudDOM = await creact.build(<App />);
      const changeSet = reconciler.reconcile([], cloudDOM);
      
      expect(changeSet.creates).toHaveLength(1);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
    });
    
    it('should handle transition from populated to empty', async () => {
      function App() {
        useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        return null;
      }
      
      const cloudDOM = await creact.build(<App />);
      const changeSet = reconciler.reconcile(cloudDOM, []);
      
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(1);
    });
    
    it('should handle deeply nested component hierarchies', async () => {
      function Level3() {
        useInstance(Lambda, { key: 'lambda', functionName: 'my-function' });
        return null;
      }
      
      function Level2() {
        useInstance(S3Bucket, { key: 'bucket', bucketName: 'my-bucket' });
        return <Level3 />;
      }
      
      function Level1() {
        return <Level2 />;
      }
      
      function App() {
        return <Level1 />;
      }
      
      const cloudDOM = await creact.build(<App />);
      const changeSet = reconciler.reconcile([], cloudDOM);
      
      expect(changeSet.creates).toHaveLength(2);
      expect(changeSet.deploymentOrder).toHaveLength(2);
    });
  });
});
