/**
 * Placeholder Proxy Tests
 *
 * Tests the fix for skipped resources never being re-applied.
 *
 * Key behavior changes:
 * 1. Nodes with undefined props are NOT created in the registry - instead
 *    useInstance returns a placeholder proxy that returns undefined for all outputs
 * 2. When dependencies resolve, components re-render and call useInstance again
 *    with defined props - NOW the real node is created
 * 3. Synchronous batching ensures re-renders happen immediately when
 *    fillInstanceOutputs is called (no async waiting needed)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useInstance, resetRuntime, type OutputAccessors } from '../src/index.js';
import { getAllNodes, getNodeById, clearNodeRegistry } from '../src/primitives/instance.js';
import { MockProvider } from './utils/mock-provider.js';
import { TestRuntime } from './utils/test-runtime.js';

// Construct classes
class Database {}
class Lambda {}
class LambdaFunctionUrl {}
class S3Bucket {}
class S3Object {}

// Output types
type DatabaseOutputs = { tableName: string; arn: string };
type LambdaOutputs = { functionName: string; arn: string };
type LambdaUrlOutputs = { apiUrl: string };
type S3BucketOutputs = { bucketName: string };

describe('Placeholder Proxy Behavior', () => {
  let provider: MockProvider;
  let runtime: TestRuntime;

  beforeEach(() => {
    resetRuntime();
    provider = new MockProvider();
    runtime = new TestRuntime(provider);
  });

  describe('Nodes with undefined props are not created', () => {
    it('should NOT create a node when props contain undefined values', async () => {
      function DependentResource({ dbArn }: { dbArn: string | undefined }) {
        useInstance(Lambda, { name: 'api', dbArn });
        return null;
      }

      // Configure provider
      provider.setOutputsFn(() => ({}));

      // Render with undefined prop
      await runtime.run(<DependentResource dbArn={undefined} />);

      // No Lambda node should exist in the registry
      const allNodes = getAllNodes();
      const lambdaNodes = allNodes.filter(n => n.constructType === 'Lambda');
      expect(lambdaNodes.length).toBe(0);
    });

    it('should create node ONLY when all props are defined', async () => {
      let dbArnValue: string | undefined = undefined;

      function App() {
        return (
          <DependentResource dbArn={dbArnValue} />
        );
      }

      function DependentResource({ dbArn }: { dbArn: string | undefined }) {
        useInstance(Lambda, { name: 'api', dbArn });
        return null;
      }

      provider.setOutputsFn((node) => {
        if (node.constructType === 'Lambda') {
          return { functionName: 'api', arn: 'arn:aws:lambda:...' };
        }
        return {};
      });

      // First render with undefined - no node created
      await runtime.run(<App />);
      expect(getAllNodes().filter(n => n.constructType === 'Lambda').length).toBe(0);

      // Reset and render with defined value
      resetRuntime();
      provider.reset();
      dbArnValue = 'arn:aws:dynamodb:...';

      await runtime.run(<App />);
      const lambdaNodes = getAllNodes().filter(n => n.constructType === 'Lambda');
      expect(lambdaNodes.length).toBe(1);
      expect(lambdaNodes[0].props.dbArn).toBe('arn:aws:dynamodb:...');
    });
  });

  describe('Placeholder proxy returns undefined for all outputs', () => {
    it('should return undefined for any output access on placeholder', async () => {
      let capturedOutputs: OutputAccessors<LambdaOutputs> | null = null;

      function DependentResource({ dbArn }: { dbArn: string | undefined }) {
        const outputs = useInstance<LambdaOutputs>(Lambda, { name: 'api', dbArn });
        capturedOutputs = outputs;
        return null;
      }

      provider.setOutputsFn(() => ({}));

      await runtime.run(<DependentResource dbArn={undefined} />);

      // Placeholder should return undefined for all outputs
      expect(capturedOutputs).not.toBeNull();
      expect(capturedOutputs!.functionName()).toBeUndefined();
      expect(capturedOutputs!.arn()).toBeUndefined();
      // Even arbitrary properties should return undefined
      expect((capturedOutputs as any).nonExistent()).toBeUndefined();
    });
  });

  describe('Resource path is maintained for placeholders', () => {
    it('should maintain correct resource path through placeholder components', async () => {
      const capturedIds: string[] = [];

      function Parent() {
        const db = useInstance<DatabaseOutputs>(Database, { name: 'main' });
        return <Child parentArn={db.arn()} />;
      }

      function Child({ parentArn }: { parentArn: string | undefined }) {
        const outputs = useInstance(Lambda, { name: 'child', parentArn });
        return <GrandChild lambdaArn={outputs.arn()} />;
      }

      function GrandChild({ lambdaArn }: { lambdaArn: string | undefined }) {
        useInstance(LambdaFunctionUrl, { name: 'url', lambdaArn });
        return null;
      }

      provider.setOutputsFn((node) => {
        capturedIds.push(node.id);

        if (node.constructType === 'Database') {
          return { tableName: 'main', arn: 'arn:aws:dynamodb:...' };
        }
        if (node.constructType === 'Lambda') {
          return { functionName: 'child', arn: 'arn:aws:lambda:...' };
        }
        if (node.constructType === 'LambdaFunctionUrl') {
          return { apiUrl: 'https://...' };
        }
        return {};
      });

      await runtime.run(<Parent />);

      // All three resources should eventually be created with correct hierarchical IDs
      const allNodes = getAllNodes();
      expect(allNodes.length).toBe(3);

      // Verify path hierarchy
      const db = allNodes.find(n => n.constructType === 'Database');
      const lambda = allNodes.find(n => n.constructType === 'Lambda');
      const url = allNodes.find(n => n.constructType === 'LambdaFunctionUrl');

      expect(db).toBeDefined();
      expect(lambda).toBeDefined();
      expect(url).toBeDefined();

      // Lambda should be under Database in the path
      expect(lambda!.path.length).toBeGreaterThan(db!.path.length);
      // URL should be under Lambda
      expect(url!.path.length).toBeGreaterThan(lambda!.path.length);
    });
  });

  describe('Synchronous batching triggers immediate re-renders', () => {
    it('should create new nodes immediately after fillInstanceOutputs', async () => {
      const nodeCountsAfterEachApply: number[] = [];

      function App() {
        const db = useInstance<DatabaseOutputs>(Database, { name: 'main' });
        return <Lambda name="api" dbArn={db.arn()} />;
      }

      function Lambda({ name, dbArn }: { name: string; dbArn: string | undefined }) {
        useInstance(Lambda, { name, dbArn });
        return null;
      }

      provider.setOutputsFn((node) => {
        // Record node count BEFORE this apply returns
        // With synchronous batching, the count should increase immediately
        nodeCountsAfterEachApply.push(getAllNodes().length);

        if (node.constructType === 'Database') {
          return { tableName: 'main', arn: 'arn:aws:dynamodb:...' };
        }
        if (node.constructType === 'Lambda') {
          return { functionName: 'api', arn: 'arn:aws:lambda:...' };
        }
        return {};
      });

      await runtime.run(<App />);

      // First apply (Database): 1 node exists
      // After Database outputs filled, Lambda re-renders synchronously
      // Second apply (Lambda): should now see 2 nodes
      expect(nodeCountsAfterEachApply[0]).toBe(1); // Database
      expect(nodeCountsAfterEachApply[1]).toBe(2); // Database + Lambda
    });
  });

  describe('Complex dependency chains', () => {
    /**
     * Real-world scenario from the bug report:
     * DynamoDB → Lambda → LambdaFunctionUrl
     *                  ↘ S3Bucket → S3Object (needs LambdaFunctionUrl.apiUrl)
     */
    it('should handle the demo app dependency chain correctly', async () => {
      function DemoApp() {
        const db = useInstance<DatabaseOutputs>(Database, { tableName: 'items' });

        return (
          <LambdaStack dbArn={db.arn()}>
            {(apiUrl) => <WebsiteStack apiUrl={apiUrl} />}
          </LambdaStack>
        );
      }

      function LambdaStack({
        dbArn,
        children,
      }: {
        dbArn: string | undefined;
        children: (apiUrl: string | undefined) => any;
      }) {
        const lambda = useInstance<LambdaOutputs>(Lambda, {
          name: 'api-handler',
          dbArn,
        });

        return (
          <LambdaUrl functionArn={lambda.arn()}>
            {(url) => children(url.apiUrl())}
          </LambdaUrl>
        );
      }

      function LambdaUrl({
        functionArn,
        children,
      }: {
        functionArn: string | undefined;
        children: (outputs: OutputAccessors<LambdaUrlOutputs>) => any;
      }) {
        const outputs = useInstance<LambdaUrlOutputs>(LambdaFunctionUrl, { functionArn });
        return children(outputs);
      }

      function WebsiteStack({ apiUrl }: { apiUrl: string | undefined }) {
        const bucket = useInstance<S3BucketOutputs>(S3Bucket, { name: 'website' });
        return <S3ConfigFile bucketName={bucket.bucketName()} apiUrl={apiUrl} />;
      }

      function S3ConfigFile({
        bucketName,
        apiUrl,
      }: {
        bucketName: string | undefined;
        apiUrl: string | undefined;
      }) {
        useInstance(S3Object, {
          bucket: bucketName,
          key: 'config.json',
          content: apiUrl ? JSON.stringify({ apiUrl }) : undefined,
        });
        return null;
      }

      const appliedTypes: string[] = [];

      provider.setOutputsFn((node) => {
        appliedTypes.push(node.constructType);

        switch (node.constructType) {
          case 'Database':
            return { tableName: 'items', arn: 'arn:aws:dynamodb:...:table/items' };
          case 'Lambda':
            return { functionName: 'api-handler', arn: 'arn:aws:lambda:...:function:api-handler' };
          case 'LambdaFunctionUrl':
            return { apiUrl: 'https://abc123.lambda-url.us-east-1.on.aws/' };
          case 'S3Bucket':
            return { bucketName: 'website-bucket' };
          case 'S3Object':
            return { etag: '"abc123"' };
          default:
            return {};
        }
      });

      await runtime.run(<DemoApp />);

      // All 5 resources should be deployed
      const allNodes = getAllNodes();
      expect(allNodes.length).toBe(5);

      // Verify deployment order respects dependencies
      // Database must come before Lambda
      const dbIndex = appliedTypes.indexOf('Database');
      const lambdaIndex = appliedTypes.indexOf('Lambda');
      expect(dbIndex).toBeLessThan(lambdaIndex);

      // Lambda must come before LambdaFunctionUrl
      const urlIndex = appliedTypes.indexOf('LambdaFunctionUrl');
      expect(lambdaIndex).toBeLessThan(urlIndex);

      // S3Bucket must come before S3Object
      const bucketIndex = appliedTypes.indexOf('S3Bucket');
      const objectIndex = appliedTypes.indexOf('S3Object');
      expect(bucketIndex).toBeLessThan(objectIndex);

      // S3Object should have all its props defined
      const s3Object = allNodes.find(n => n.constructType === 'S3Object');
      expect(s3Object).toBeDefined();
      expect(s3Object!.props.bucket).toBe('website-bucket');
      expect(s3Object!.props.content).toContain('lambda-url');
    });
  });

  describe('No provider skip logic needed', () => {
    it('provider should never receive nodes with undefined props', async () => {
      const receivedNodes: { type: string; hasUndefined: boolean }[] = [];

      function App() {
        const db = useInstance<DatabaseOutputs>(Database, { name: 'main' });
        return <Lambda name="api" dbArn={db.arn()} />;
      }

      function Lambda({ name, dbArn }: { name: string; dbArn: string | undefined }) {
        useInstance(Lambda, { name, dbArn });
        return null;
      }

      provider.setOutputsFn((node) => {
        const hasUndefined = Object.values(node.props).some(v => v === undefined);
        receivedNodes.push({ type: node.constructType, hasUndefined });

        if (node.constructType === 'Database') {
          return { tableName: 'main', arn: 'arn:aws:dynamodb:...' };
        }
        if (node.constructType === 'Lambda') {
          return { functionName: 'api', arn: 'arn:aws:lambda:...' };
        }
        return {};
      });

      await runtime.run(<App />);

      // Provider should NEVER see nodes with undefined props
      // This is the key change - the old behavior had provider skipping undefined props
      // New behavior: nodes aren't created until props are defined
      for (const node of receivedNodes) {
        expect(node.hasUndefined).toBe(false);
      }
    });
  });
});
