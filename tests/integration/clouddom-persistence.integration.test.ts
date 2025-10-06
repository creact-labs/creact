// Integration tests for CloudDOM Persistence (Task 8 / REQ-01.6)
// Tests persistence in the context of the full build pipeline

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CReact } from '../../src/core/CReact';
import { DummyCloudProvider } from '../../src/providers/DummyCloudProvider';
import { DummyBackendProvider } from '../../src/providers/DummyBackendProvider';
import { useInstance } from '../../src/hooks/useInstance';
import { JSXElement } from '../../src/core/types';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

describe('CloudDOM Persistence - Integration Tests', () => {
  let testDir: string;
  let cloudProvider: DummyCloudProvider;
  let backendProvider: DummyBackendProvider;
  let creact: CReact;

  beforeEach(() => {
    // Use both timestamp and random number to ensure uniqueness across parallel tests
    testDir = `.creact-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    cloudProvider = new DummyCloudProvider();
    backendProvider = new DummyBackendProvider();
    creact = new CReact({
      cloudProvider,
      backendProvider,
      persistDir: testDir,
    });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Full Pipeline Integration', () => {
    it('should persist CloudDOM after complete build pipeline', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('my-bucket', S3Bucket, {
          bucketName: 'test-bucket',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act
      const cloudDOM = await creact.build(jsx);

      // Assert
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      expect(fs.existsSync(cloudDOMPath)).toBe(true);

      const fileContent = fs.readFileSync(cloudDOMPath, 'utf-8');
      const parsedContent = JSON.parse(fileContent);
      
      // Compare without construct field (functions can't be serialized)
      const cloudDOMWithoutConstruct = JSON.parse(JSON.stringify(cloudDOM));
      expect(parsedContent).toEqual(cloudDOMWithoutConstruct);
    });

    it('should persist complex nested infrastructure', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      class CloudFrontDistribution {
        constructor(public props: any) {}
      }

      class LambdaFunction {
        constructor(public props: any) {}
      }

      function StaticAssets() {
        const bucket = useInstance(S3Bucket, {
          bucketName: 'my-assets',
        });
        const cdn = useInstance(CloudFrontDistribution, {
          originBucket: 'assets-bucket',
        });
        return null;
      }

      function ApiBackend() {
        const handler = useInstance(LambdaFunction, {
          functionName: 'api',
          runtime: 'nodejs20.x',
        });
        return null;
      }

      function WebAppStack({ children }: any) {
        return children;
      }

      const jsx: JSXElement = {
        type: WebAppStack,
        props: {
          children: [
            {
              type: StaticAssets,
              props: {},
              key: 'static',
            },
            {
              type: ApiBackend,
              props: {},
              key: 'api',
            },
          ],
        },
        key: 'web-app',
      };

      // Act
      const cloudDOM = await creact.build(jsx);

      // Assert
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      const fileContent = fs.readFileSync(cloudDOMPath, 'utf-8');
      const parsedContent = JSON.parse(fileContent);

      // Compare without construct field (functions can't be serialized)
      const cloudDOMWithoutConstruct = JSON.parse(JSON.stringify(cloudDOM));
      expect(parsedContent).toEqual(cloudDOMWithoutConstruct);
      expect(parsedContent.length).toBeGreaterThan(0);
    });

    it('should persist empty CloudDOM when no resources defined', async () => {
      // Arrange
      function EmptyStack() {
        return null;
      }

      const jsx: JSXElement = {
        type: EmptyStack,
        props: {},
        key: 'empty',
      };

      // Act
      const cloudDOM = await creact.build(jsx);

      // Assert
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      const fileContent = fs.readFileSync(cloudDOMPath, 'utf-8');
      const parsedContent = JSON.parse(fileContent);

      expect(parsedContent).toEqual([]);
      expect(cloudDOM).toEqual([]);
    });
  });

  describe('Persistence Consistency', () => {
    it('should persist identical CloudDOM on repeated builds', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('my-bucket', S3Bucket, {
          bucketName: 'test-bucket',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act
      await creact.build(jsx);
      const firstContent = fs.readFileSync(
        path.join(testDir, 'clouddom.json'),
        'utf-8'
      );
      const firstChecksum = fs.readFileSync(
        path.join(testDir, 'clouddom.sha256'),
        'utf-8'
      );

      await creact.build(jsx);
      const secondContent = fs.readFileSync(
        path.join(testDir, 'clouddom.json'),
        'utf-8'
      );
      const secondChecksum = fs.readFileSync(
        path.join(testDir, 'clouddom.sha256'),
        'utf-8'
      );

      // Assert
      expect(secondContent).toBe(firstContent);
      expect(secondChecksum).toBe(firstChecksum);
    });

    it('should update persisted CloudDOM when infrastructure changes', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function Stack1() {
        useInstance('bucket1', S3Bucket, {
          bucketName: 'bucket-1',
        });
        return null;
      }

      function Stack2() {
        useInstance('bucket2', S3Bucket, {
          bucketName: 'bucket-2',
        });
        return null;
      }

      const jsx1: JSXElement = {
        type: Stack1,
        props: {},
        key: 'stack',
      };

      const jsx2: JSXElement = {
        type: Stack2,
        props: {},
        key: 'stack',
      };

      // Act
      await creact.build(jsx1);
      const firstContent = fs.readFileSync(
        path.join(testDir, 'clouddom.json'),
        'utf-8'
      );

      await creact.build(jsx2);
      const secondContent = fs.readFileSync(
        path.join(testDir, 'clouddom.json'),
        'utf-8'
      );

      // Assert - content should be different
      expect(secondContent).not.toBe(firstContent);
    });
  });

  describe('Checksum Integrity', () => {
    it('should maintain checksum integrity across builds', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('my-bucket', S3Bucket, {
          bucketName: 'test-bucket',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act
      await creact.build(jsx);

      // Assert
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      const checksumPath = path.join(testDir, 'clouddom.sha256');

      const content = fs.readFileSync(cloudDOMPath, 'utf-8');
      const storedChecksum = fs.readFileSync(checksumPath, 'utf-8');

      const calculatedChecksum = crypto
        .createHash('sha256')
        .update(content, 'utf-8')
        .digest('hex');

      expect(storedChecksum).toBe(calculatedChecksum);
    });

    it('should detect CloudDOM tampering via checksum mismatch', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('my-bucket', S3Bucket, {
          bucketName: 'test-bucket',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act
      await creact.build(jsx);

      // Tamper with CloudDOM file
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      fs.writeFileSync(cloudDOMPath, '[]', 'utf-8');

      // Assert
      const checksumPath = path.join(testDir, 'clouddom.sha256');
      const content = fs.readFileSync(cloudDOMPath, 'utf-8');
      const storedChecksum = fs.readFileSync(checksumPath, 'utf-8');

      const calculatedChecksum = crypto
        .createHash('sha256')
        .update(content, 'utf-8')
        .digest('hex');

      // Checksums should NOT match after tampering
      expect(storedChecksum).not.toBe(calculatedChecksum);
    });
  });

  describe('Custom Persistence Directory', () => {
    it('should persist to custom directory when configured', async () => {
      // Arrange
      const customDir = `.custom-${Date.now()}`;
      const customCreact = new CReact({
        cloudProvider,
        backendProvider,
        persistDir: customDir,
      });

      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('my-bucket', S3Bucket, {
          bucketName: 'test-bucket',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act
      await customCreact.build(jsx);

      // Assert
      const customPath = path.join(customDir, 'clouddom.json');
      expect(fs.existsSync(customPath)).toBe(true);

      // Cleanup
      fs.rmSync(customDir, { recursive: true, force: true });
    });

    it('should support absolute paths for persistence directory', async () => {
      // Arrange
      const absoluteDir = path.resolve(`.absolute-${Date.now()}`);
      const absoluteCreact = new CReact({
        cloudProvider,
        backendProvider,
        persistDir: absoluteDir,
      });

      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('my-bucket', S3Bucket, {
          bucketName: 'test-bucket',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act
      await absoluteCreact.build(jsx);

      // Assert
      const absolutePath = path.join(absoluteDir, 'clouddom.json');
      expect(fs.existsSync(absolutePath)).toBe(true);

      // Cleanup
      fs.rmSync(absoluteDir, { recursive: true, force: true });
    });
  });

  describe('Concurrent Build Safety', () => {
    it('should handle sequential builds without corruption', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('my-bucket', S3Bucket, {
          bucketName: 'test-bucket',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act - run multiple builds sequentially
      await creact.build(jsx);
      await creact.build(jsx);
      await creact.build(jsx);

      // Assert
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      const content = fs.readFileSync(cloudDOMPath, 'utf-8');
      const parsedContent = JSON.parse(content);

      // Should be valid JSON
      expect(Array.isArray(parsedContent)).toBe(true);
    });
  });
});
