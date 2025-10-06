/** @jsx CReact.createElement */
/** @jsxFrag CReact.Fragment */

/**
 * Integration tests for useInstance hook with React-like API (Task 12 / REQ-04)
 * Tests hook usage in real component scenarios with Renderer and CloudDOMBuilder
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { CReact } from '../../src/jsx';
import { CReact as CReactCore } from '../../src/core/CReact';
import { DummyCloudProvider } from '../../src/providers/DummyCloudProvider';
import { DummyBackendProvider } from '../../src/providers/DummyBackendProvider';
import { useInstance } from '../../src/hooks/useInstance';

// Mock infrastructure constructs
class S3Bucket {
  constructor(public props: any) {}
}

class LambdaFunction {
  constructor(public props: any) {}
}

class RDSInstance {
  constructor(public props: any) {}
}

class EcrRepository {
  constructor(public props: any) {}
}

describe('useInstance Hook - Integration Tests (React-like API)', () => {
  let creact: CReactCore;
  let cloudProvider: DummyCloudProvider;
  let backendProvider: DummyBackendProvider;
  let testDir: string;

  beforeEach(() => {
    testDir = `.creact-useinstance-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    cloudProvider = new DummyCloudProvider();
    backendProvider = new DummyBackendProvider();
    creact = new CReactCore({
      cloudProvider,
      backendProvider,
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Hook Usage in Components', () => {
    it('should work in simple component with explicit key', async () => {
      function MyStack() {
        useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'my-bucket',
        });
        return null;
      }

      const element = <MyStack />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM).toHaveLength(1);
      expect(cloudDOM[0].id).toBe('my-stack.bucket');
      expect(cloudDOM[0].props.bucketName).toBe('my-bucket');
    });

    it('should work with auto-generated IDs', async () => {
      function MyStack() {
        useInstance(S3Bucket, {
          bucketName: 'my-bucket',
        });
        return null;
      }

      const element = <MyStack />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM).toHaveLength(1);
      expect(cloudDOM[0].id).toBe('my-stack.s-3-bucket');
      expect(cloudDOM[0].props.bucketName).toBe('my-bucket');
    });

    it('should work with multiple resources using keys', async () => {
      function MyStack() {
        useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'my-bucket',
        });
        useInstance(LambdaFunction, {
          key: 'function',
          functionName: 'my-function',
        });
        return null;
      }

      const element = <MyStack />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM).toHaveLength(2);
      expect(cloudDOM.find(n => n.id === 'my-stack.bucket')).toBeDefined();
      expect(cloudDOM.find(n => n.id === 'my-stack.function')).toBeDefined();
    });

    it('should work with multiple resources of same type using auto-IDs', async () => {
      function MyStack() {
        useInstance(S3Bucket, { bucketName: 'bucket-1' });
        useInstance(S3Bucket, { bucketName: 'bucket-2' });
        return null;
      }

      const element = <MyStack />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM).toHaveLength(2);
      expect(cloudDOM[0].id).toBe('my-stack.s-3-bucket');
      expect(cloudDOM[1].id).toBe('my-stack.s-3-bucket-1');
    });

    it('should work in nested components', async () => {
      function Storage() {
        useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'my-bucket',
        });
        return null;
      }

      function Compute() {
        useInstance(LambdaFunction, {
          key: 'function',
          functionName: 'my-function',
        });
        return null;
      }

      function MyStack() {
        return (
          <>
            <Storage />
            <Compute />
          </>
        );
      }

      const element = <MyStack />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM).toHaveLength(2);
      expect(cloudDOM.find(n => n.id === 'my-stack.anonymous.storage.bucket')).toBeDefined();
      expect(cloudDOM.find(n => n.id === 'my-stack.anonymous.compute.function')).toBeDefined();
    });

    it('should work with deeply nested components', async () => {
      function BucketComponent() {
        useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'nested-bucket',
        });
        return null;
      }

      function Storage() {
        return <BucketComponent />;
      }

      function Service() {
        return <Storage />;
      }

      function App() {
        return <Service />;
      }

      const element = <App />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM).toHaveLength(1);
      expect(cloudDOM[0].id).toBe('app.service.storage.bucket-component.bucket');
    });
  });

  describe('Resource References', () => {
    it('should allow resources to reference each other', async () => {
      function MyStack() {
        const bucket = useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'my-bucket',
        });

        useInstance(LambdaFunction, {
          key: 'function',
          functionName: 'my-function',
          environment: {
            BUCKET_ID: bucket.id,
          },
        });

        return null;
      }

      const element = <MyStack />;
      const cloudDOM = await creact.build(element);

      const lambda = cloudDOM.find(n => n.id === 'my-stack.function');
      expect(lambda).toBeDefined();
      expect(lambda!.props.environment.BUCKET_ID).toBe('my-stack.bucket');
    });

    it('should allow cross-component resource references', async () => {
      let bucketRef: any;

      function Storage() {
        bucketRef = useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'shared-bucket',
        });
        return null;
      }

      function Compute() {
        useInstance(LambdaFunction, {
          key: 'function',
          functionName: 'my-function',
          environment: {
            BUCKET_ID: bucketRef?.id || 'unknown',
          },
        });
        return null;
      }

      function MyStack() {
        return (
          <>
            <Storage />
            <Compute />
          </>
        );
      }

      const element = <MyStack />;
      const cloudDOM = await creact.build(element);

      const lambda = cloudDOM.find(n => n.id.includes('function'));
      expect(lambda).toBeDefined();
      expect(lambda!.props.environment.BUCKET_ID).toContain('bucket');
    });
  });

  describe('Props Handling', () => {
    it('should pass complex props correctly', async () => {
      function MyStack() {
        useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'complex-bucket',
          versioning: {
            enabled: true,
            mfaDelete: false,
          },
          lifecycle: {
            rules: [
              {
                id: 'rule1',
                enabled: true,
                transitions: [
                  { days: 30, storageClass: 'GLACIER' },
                  { days: 90, storageClass: 'DEEP_ARCHIVE' },
                ],
              },
            ],
          },
          tags: {
            Environment: 'production',
            Team: 'platform',
          },
        });
        return null;
      }

      const element = <MyStack />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM[0].props).toMatchObject({
        bucketName: 'complex-bucket',
        versioning: {
          enabled: true,
          mfaDelete: false,
        },
        lifecycle: {
          rules: [
            {
              id: 'rule1',
              enabled: true,
            },
          ],
        },
        tags: {
          Environment: 'production',
          Team: 'platform',
        },
      });
    });

    it('should handle dynamic props from component props', async () => {
      interface StackProps {
        bucketName: string;
        environment: string;
      }

      function MyStack({ bucketName, environment }: StackProps) {
        useInstance(S3Bucket, {
          key: 'bucket',
          bucketName,
          tags: {
            Environment: environment,
          },
        });
        return null;
      }

      const element = <MyStack bucketName="dynamic-bucket" environment="staging" />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM[0].props.bucketName).toBe('dynamic-bucket');
      expect(cloudDOM[0].props.tags.Environment).toBe('staging');
    });
  });

  describe('Component Composition', () => {
    it('should work with component composition patterns', async () => {
      function Website() {
        useInstance(S3Bucket, {
          key: 'static',
          bucketName: 'website-static',
        });
        useInstance(S3Bucket, {
          key: 'assets',
          bucketName: 'website-assets',
        });
        return null;
      }

      function App() {
        return <Website />;
      }

      const element = <App />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM).toHaveLength(2);
      expect(cloudDOM.find(n => n.id === 'app.website.static')).toBeDefined();
      expect(cloudDOM.find(n => n.id === 'app.website.assets')).toBeDefined();
    });

    it('should work with conditional rendering', async () => {
      interface StackProps {
        includeDatabase: boolean;
      }

      function MyStack({ includeDatabase }: StackProps) {
        useInstance(S3Bucket, {
          key: 'bucket',
          bucketName: 'my-bucket',
        });

        if (includeDatabase) {
          useInstance(RDSInstance, {
            key: 'db',
            name: 'my-db',
          });
        }

        return null;
      }

      const withDb = <MyStack includeDatabase={true} />;
      const cloudDOMWithDb = await creact.build(withDb);

      expect(cloudDOMWithDb).toHaveLength(2);
      expect(cloudDOMWithDb.find(n => n.id === 'my-stack.bucket')).toBeDefined();
      expect(cloudDOMWithDb.find(n => n.id === 'my-stack.db')).toBeDefined();
    });

    it('should work with array mapping', async () => {
      function MyStack() {
        const services = ['api', 'worker', 'scheduler'];
        services.forEach(name => {
          useInstance(LambdaFunction, {
            key: name,
            functionName: `${name}-function`,
          });
        });
        return null;
      }

      const element = <MyStack />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM).toHaveLength(3);
      expect(cloudDOM.find(n => n.id === 'my-stack.api')).toBeDefined();
      expect(cloudDOM.find(n => n.id === 'my-stack.worker')).toBeDefined();
      expect(cloudDOM.find(n => n.id === 'my-stack.scheduler')).toBeDefined();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical web application stack', async () => {
      function Website() {
        useInstance(S3Bucket, {
          key: 'static',
          bucketName: 'website-static',
        });
        useInstance(S3Bucket, {
          key: 'assets',
          bucketName: 'website-assets',
        });
        return null;
      }

      function API() {
        useInstance(LambdaFunction, {
          key: 'handler',
          functionName: 'api-handler',
        });
        return null;
      }

      function Database() {
        useInstance(RDSInstance, {
          key: 'primary',
          name: 'app-db',
        });
        return null;
      }

      function WebApp() {
        return (
          <>
            <Website />
            <API />
            <Database />
          </>
        );
      }

      const element = <WebApp />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM.length).toBeGreaterThanOrEqual(4);
      expect(cloudDOM.find(n => n.id.includes('static'))).toBeDefined();
      expect(cloudDOM.find(n => n.id.includes('assets'))).toBeDefined();
      expect(cloudDOM.find(n => n.id.includes('handler'))).toBeDefined();
      expect(cloudDOM.find(n => n.id.includes('primary'))).toBeDefined();
    });

    it('should handle microservices architecture', async () => {
      interface ServiceProps {
        name: string;
      }

      function Service({ name }: ServiceProps) {
        useInstance(EcrRepository, {
          key: 'repo',
          name: `${name}-repo`,
        });
        useInstance(LambdaFunction, {
          key: 'function',
          functionName: `${name}-function`,
        });
        return null;
      }

      function App() {
        return (
          <>
            <Service name="users" />
            <Service name="orders" />
            <Service name="payments" />
          </>
        );
      }

      const element = <App />;
      const cloudDOM = await creact.build(element);

      expect(cloudDOM.length).toBeGreaterThanOrEqual(6);
      expect(cloudDOM.filter(n => n.construct === EcrRepository)).toHaveLength(3);
      expect(cloudDOM.filter(n => n.construct === LambdaFunction)).toHaveLength(3);
    });
  });
});
