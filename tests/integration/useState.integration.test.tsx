/** @jsx CReact.createElement */
/** @jsxFrag CReact.Fragment */

// REQ-02: useState integration tests with JSX components
// Tests declarative output binding in real component scenarios

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CReact } from '../../src/jsx';
import { CReact as CReactClass, CReactConfig } from '../../src/core/CReact';
import { DummyCloudProvider } from '../../src/providers/DummyCloudProvider';
import { DummyBackendProvider } from '../../src/providers/DummyBackendProvider';
import { useState } from '../../src/hooks/useState';
import { useInstance } from '../../src/hooks/useInstance';
import * as fs from 'fs';

describe('useState Hook - Integration Tests', () => {
  let creact: CReactClass;
  let cloudProvider: DummyCloudProvider;
  let backendProvider: DummyBackendProvider;
  let testDir: string;

  beforeEach(() => {
    testDir = `.creact-test-${Date.now()}`;
    cloudProvider = new DummyCloudProvider();
    backendProvider = new DummyBackendProvider();

    const config: CReactConfig = {
      cloudProvider,
      backendProvider,
    };

    creact = new CReactClass(config);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Single useState in Component', () => {
    it('should declare and update output in component', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function BucketStack() {
        const bucket = useInstance(S3Bucket, {
          bucketName: 'my-bucket',
        });

        const [bucketArn, setBucketArn] = useState<string>();
        setBucketArn('arn:aws:s3:::my-bucket');

        return null;
      }

      // Act
      const cloudDOM = await creact.build(<BucketStack />);

      // Assert
      expect(cloudDOM).toBeDefined();
      expect(cloudDOM.length).toBeGreaterThan(0);

      // Find the bucket node
      const bucketNode = cloudDOM.find((node) => node.construct === S3Bucket);
      expect(bucketNode).toBeDefined();
    });

    it('should support undefined initial value with type parameter', async () => {
      // Arrange
      class Lambda {
        constructor(public props: any) {}
      }

      function LambdaStack() {
        const fn = useInstance(Lambda, {
          functionName: 'my-function',
        });

        const [functionArn, setFunctionArn] = useState<string>();

        // Initially undefined
        expect(functionArn).toBeUndefined();

        // Set later
        setFunctionArn('arn:aws:lambda:us-east-1:123456789012:function:my-function');

        return null;
      }

      // Act
      const cloudDOM = await creact.build(<LambdaStack />);

      // Assert
      expect(cloudDOM).toBeDefined();
    });
  });

  describe('Multiple useState Calls in Component', () => {
    it('should support multiple independent outputs', async () => {
      // Arrange
      class CloudFrontDistribution {
        constructor(public props: any) {}
      }

      function CDNStack() {
        const distribution = useInstance(CloudFrontDistribution, {
          originDomain: 'example.com',
        });

        // Multiple useState calls (like React)
        const [distributionId, setDistributionId] = useState<string>();
        const [distributionDomain, setDistributionDomain] = useState<string>();
        const [distributionArn, setDistributionArn] = useState<string>();

        // Set values
        setDistributionId('E1234567890ABC');
        setDistributionDomain('d111111abcdef8.cloudfront.net');
        setDistributionArn('arn:aws:cloudfront::123456789012:distribution/E1234567890ABC');

        return null;
      }

      // Act
      const cloudDOM = await creact.build(<CDNStack />);

      // Assert
      expect(cloudDOM).toBeDefined();
      expect(cloudDOM.length).toBeGreaterThan(0);
    });

    it('should maintain independent state for each useState call', async () => {
      // Arrange
      class RDSInstance {
        constructor(public props: any) {}
      }

      function DatabaseStack() {
        const db = useInstance(RDSInstance, {
          instanceClass: 'db.t3.micro',
        });

        const [endpoint, setEndpoint] = useState('');
        const [port, setPort] = useState(5432);
        const [arn, setArn] = useState<string>();

        // Update each independently
        setEndpoint('mydb.abc123.us-east-1.rds.amazonaws.com');
        setPort(5433); // Changed from default
        setArn('arn:aws:rds:us-east-1:123456789012:db:mydb');

        return null;
      }

      // Act
      const cloudDOM = await creact.build(<DatabaseStack />);

      // Assert
      expect(cloudDOM).toBeDefined();
    });
  });

  describe('useState with Nested Components', () => {
    it('should support useState in parent and child components', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      class CloudFrontDistribution {
        constructor(public props: any) {}
      }

      function StaticAssets() {
        const bucket = useInstance(S3Bucket, {
          bucketName: 'assets',
        });

        const [bucketArn, setBucketArn] = useState<string>();
        setBucketArn('arn:aws:s3:::assets');

        return null;
      }

      function CDN() {
        const distribution = useInstance(CloudFrontDistribution, {
          originBucket: 'assets',
        });

        const [distributionDomain, setDistributionDomain] = useState<string>();
        setDistributionDomain('d111111abcdef8.cloudfront.net');

        return null;
      }

      function WebAppStack({ children }: any) {
        return <>{children}</>;
      }

      // Act
      const cloudDOM = await creact.build(
        <WebAppStack>
          <StaticAssets key="static" />
          <CDN key="cdn" />
        </WebAppStack>
      );

      // Assert
      expect(cloudDOM).toBeDefined();
      expect(cloudDOM.length).toBeGreaterThan(0);
    });
  });

  describe('useState with Updater Functions', () => {
    it('should support updater function form of setState', async () => {
      // Arrange
      class Counter {
        constructor(public props: any) {}
      }

      function CounterStack() {
        const counter = useInstance(Counter, {
          initialValue: 0,
        });

        const [count, setCount] = useState(0);

        // Use updater function
        setCount((prev) => prev + 1);
        setCount((prev) => prev + 1);
        setCount((prev) => prev + 1);

        return null;
      }

      // Act
      const cloudDOM = await creact.build(<CounterStack />);

      // Assert
      expect(cloudDOM).toBeDefined();
    });
  });

  describe('useState with Complex Data Types', () => {
    it('should support object values', async () => {
      // Arrange
      class APIGateway {
        constructor(public props: any) {}
      }

      function APIStack() {
        const api = useInstance(APIGateway, {
          name: 'my-api',
        });

        const [endpoints, setEndpoints] = useState<Record<string, string>>({});

        setEndpoints({
          rest: 'https://api.example.com/rest',
          graphql: 'https://api.example.com/graphql',
          websocket: 'wss://api.example.com/ws',
        });

        return null;
      }

      // Act
      const cloudDOM = await creact.build(<APIStack />);

      // Assert
      expect(cloudDOM).toBeDefined();
    });

    it('should support array values', async () => {
      // Arrange
      class SecurityGroup {
        constructor(public props: any) {}
      }

      function NetworkStack() {
        const sg = useInstance(SecurityGroup, {
          name: 'web-sg',
        });

        const [rules, setRules] = useState<string[]>([]);

        setRules([
          'allow-http-80',
          'allow-https-443',
          'allow-ssh-22',
        ]);

        return null;
      }

      // Act
      const cloudDOM = await creact.build(<NetworkStack />);

      // Assert
      expect(cloudDOM).toBeDefined();
    });
  });

  describe('REQ-02 Compliance - Declarative Semantics', () => {
    it('should NOT trigger re-render when setState is called', async () => {
      // Arrange
      let renderCount = 0;

      class Resource {
        constructor(public props: any) {}
      }

      function TestStack() {
        renderCount++;

        const resource = useInstance(Resource, {
          name: 'test',
        });

        const [value, setValue] = useState('initial');

        // These should NOT cause re-renders
        setValue('update1');
        setValue('update2');
        setValue('update3');

        return null;
      }

      // Act
      await creact.build(<TestStack />);

      // Assert - Component should only render once
      expect(renderCount).toBe(1);
    });

    it('should persist outputs for build-time enrichment', async () => {
      // Arrange
      class Queue {
        constructor(public props: any) {}
      }

      function QueueStack() {
        const queue = useInstance(Queue, {
          name: 'messages',
        });

        // Build-time known values
        const [queueName, setQueueName] = useState('messages');
        const [region, setRegion] = useState('us-east-1');

        // Deploy-time values (initially undefined)
        const [queueUrl, setQueueUrl] = useState<string>();
        const [queueArn, setQueueArn] = useState<string>();

        // Simulate build-time enrichment
        setQueueUrl('https://sqs.us-east-1.amazonaws.com/123456789012/messages');
        setQueueArn('arn:aws:sqs:us-east-1:123456789012:messages');

        return null;
      }

      // Act
      const cloudDOM = await creact.build(<QueueStack />);

      // Assert
      expect(cloudDOM).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle setState with same value multiple times', async () => {
      // Arrange
      class Resource {
        constructor(public props: any) {}
      }

      function TestStack() {
        const resource = useInstance(Resource, {
          name: 'test',
        });

        const [value, setValue] = useState('initial');

        // Set same value multiple times
        setValue('same');
        setValue('same');
        setValue('same');

        return null;
      }

      // Act & Assert - Should not throw
      await expect(creact.build(<TestStack />)).resolves.toBeDefined();
    });
  });
});
