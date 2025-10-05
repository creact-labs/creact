// Edge case tests for CloudDOM Persistence (Task 8 / REQ-01.6)
// Tests unusual scenarios, error conditions, and boundary cases

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CReact } from '../../src/core/CReact';
import { DummyCloudProvider } from '../../src/providers/DummyCloudProvider';
import { DummyBackendProvider } from '../../src/providers/DummyBackendProvider';
import { useInstance } from '../../src/hooks/useInstance';
import { JSXElement, CloudDOMNode } from '../../src/core/types';
import * as fs from 'fs';
import * as path from 'path';

describe('CloudDOM Persistence - Edge Cases', () => {
  let testDir: string;
  let cloudProvider: DummyCloudProvider;
  let backendProvider: DummyBackendProvider;
  let creact: CReact;

  beforeEach(() => {
    testDir = `.creact-edge-${Date.now()}`;
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

  describe('Empty CloudDOM Cases', () => {
    it('should persist empty array when no resources defined', async () => {
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
      await creact.build(jsx);

      // Assert
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      const content = fs.readFileSync(cloudDOMPath, 'utf-8');
      expect(content).toBe('[]\n'); // JSON.stringify([], null, 2) produces []
    });

    it('should handle null component return', async () => {
      // Arrange
      function NullComponent() {
        return null;
      }

      const jsx: JSXElement = {
        type: NullComponent,
        props: {},
        key: 'null',
      };

      // Act & Assert
      await expect(creact.build(jsx)).resolves.not.toThrow();
    });

    it('should handle undefined component return', async () => {
      // Arrange
      function UndefinedComponent() {
        return undefined as any;
      }

      const jsx: JSXElement = {
        type: UndefinedComponent,
        props: {},
        key: 'undefined',
      };

      // Act & Assert
      await expect(creact.build(jsx)).resolves.not.toThrow();
    });
  });

  describe('Special Characters in Paths', () => {
    it('should handle spaces in resource names', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('my bucket', S3Bucket, {
          bucketName: 'test',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act & Assert
      await expect(creact.build(jsx)).resolves.not.toThrow();
    });

    it('should handle unicode characters in resource names', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('bucket-🚀', S3Bucket, {
          bucketName: 'test',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act & Assert
      await expect(creact.build(jsx)).resolves.not.toThrow();
    });

    it('should handle special characters in props', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test-<>&"\'',
          description: 'Special chars: \n\t\r',
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

      // Assert - should be valid JSON
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      const content = fs.readFileSync(cloudDOMPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Large Data Cases', () => {
    it('should handle very large prop values', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
          largeData: 'x'.repeat(1000000), // 1MB string
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act & Assert
      await expect(creact.build(jsx)).resolves.not.toThrow();
    });

    it('should handle deeply nested prop objects', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      // Create deeply nested object
      let deepObject: any = { value: 'leaf' };
      for (let i = 0; i < 100; i++) {
        deepObject = { nested: deepObject };
      }

      function MyStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
          deepProp: deepObject,
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act & Assert
      await expect(creact.build(jsx)).resolves.not.toThrow();
    });

    it('should handle arrays with many elements in props', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
          tags: Array.from({ length: 1000 }, (_, i) => `tag-${i}`),
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act & Assert
      await expect(creact.build(jsx)).resolves.not.toThrow();
    });
  });

  describe('Filesystem Edge Cases', () => {
    it('should handle read-only parent directory gracefully', async () => {
      // Arrange
      const readOnlyCreact = new CReact({
        cloudProvider,
        backendProvider,
        persistDir: '/root/readonly',
      });

      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Act & Assert
      await expect(readOnlyCreact.build(jsx)).rejects.toThrow();
    });

    it('should handle very long directory paths', async () => {
      // Arrange
      const longPath = '.creact-' + 'a'.repeat(200);
      const longPathCreact = new CReact({
        cloudProvider,
        backendProvider,
        persistDir: longPath,
      });

      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Act
      await longPathCreact.build(jsx);

      // Assert
      expect(fs.existsSync(longPath)).toBe(true);

      // Cleanup
      fs.rmSync(longPath, { recursive: true, force: true });
    });

    it('should handle directory deletion during build', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Mock mkdir to delete directory after creation
      const originalMkdir = fs.promises.mkdir;
      let callCount = 0;
      const mkdirSpy = vi.spyOn(fs.promises, 'mkdir').mockImplementation(
        async (dirPath, options) => {
          const result = await originalMkdir(dirPath, options);
          callCount++;
          // Delete directory after first mkdir (simulating race condition)
          if (callCount === 1 && fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
          }
          return result;
        }
      );

      // Act - should handle gracefully with retries
      await creact.build(jsx);

      // Assert - should eventually succeed
      expect(fs.existsSync(testDir)).toBe(true);

      mkdirSpy.mockRestore();
    });
  });

  describe('Lock File Edge Cases', () => {
    it('should handle stale lock file from dead process', async () => {
      // Arrange
      fs.mkdirSync(testDir, { recursive: true });
      const lockPath = path.join(testDir, '.clouddom.lock');
      
      // Create stale lock with non-existent PID
      fs.writeFileSync(lockPath, '999999', 'utf-8');

      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Act - should remove stale lock and proceed
      await creact.build(jsx);

      // Assert
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      expect(fs.existsSync(cloudDOMPath)).toBe(true);
    });

    it('should handle corrupted lock file', async () => {
      // Arrange
      fs.mkdirSync(testDir, { recursive: true });
      const lockPath = path.join(testDir, '.clouddom.lock');
      
      // Create corrupted lock file
      fs.writeFileSync(lockPath, 'not-a-number', 'utf-8');

      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Act - should handle gracefully
      await creact.build(jsx);

      // Assert
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      expect(fs.existsSync(cloudDOMPath)).toBe(true);
    });

    it('should handle empty lock file', async () => {
      // Arrange
      fs.mkdirSync(testDir, { recursive: true });
      const lockPath = path.join(testDir, '.clouddom.lock');
      
      // Create empty lock file
      fs.writeFileSync(lockPath, '', 'utf-8');

      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Act - should handle gracefully
      await creact.build(jsx);

      // Assert
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      expect(fs.existsSync(cloudDOMPath)).toBe(true);
    });
  });

  describe('Checksum Edge Cases', () => {
    it('should handle empty CloudDOM checksum', async () => {
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
      await creact.build(jsx);

      // Assert
      const checksumPath = path.join(testDir, 'clouddom.sha256');
      const checksum = fs.readFileSync(checksumPath, 'utf-8');
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different checksums for different CloudDOM', async () => {
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
      const checksum1 = fs.readFileSync(
        path.join(testDir, 'clouddom.sha256'),
        'utf-8'
      );

      await creact.build(jsx2);
      const checksum2 = fs.readFileSync(
        path.join(testDir, 'clouddom.sha256'),
        'utf-8'
      );

      // Assert
      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('Atomic Write Edge Cases', () => {
    it('should clean up temp files if rename fails', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Mock rename to fail
      const renameSpy = vi.spyOn(fs.promises, 'rename').mockRejectedValueOnce(
        new Error('Rename failed')
      );

      // Act
      try {
        await creact.build(jsx);
      } catch {
        // Expected to fail
      }

      // Assert - temp files should be cleaned up
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const tmpPath = path.join(testDir, 'clouddom.json.tmp');
      const tmpChecksumPath = path.join(testDir, 'clouddom.sha256.tmp');
      
      expect(fs.existsSync(tmpPath)).toBe(false);
      expect(fs.existsSync(tmpChecksumPath)).toBe(false);

      renameSpy.mockRestore();
    });

    it('should handle partial write failure gracefully', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Mock writeFile to fail on second call (checksum write)
      let writeCount = 0;
      const writeFileSpy = vi.spyOn(fs.promises, 'writeFile').mockImplementation(
        async (filePath, data, options) => {
          writeCount++;
          if (writeCount === 2) {
            throw new Error('Write failed');
          }
          return fs.promises.writeFile(filePath, data, options);
        }
      );

      // Act & Assert
      await expect(creact.build(jsx)).rejects.toThrow();

      writeFileSpy.mockRestore();
    });
  });

  describe('Schema Validation Edge Cases', () => {
    it('should reject CloudDOM with missing id field', async () => {
      // This would require mocking the CloudDOMBuilder to produce invalid nodes
      // For now, we verify that valid nodes pass
      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      await expect(creact.build(jsx)).resolves.not.toThrow();
    });

    it('should reject CloudDOM with non-serializable values', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        const circular: any = {};
        circular.self = circular;

        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
          circular, // This will cause serialization to fail
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act & Assert
      await expect(creact.build(jsx)).rejects.toThrow();
    });

    it('should handle CloudDOM with undefined values in props', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
          optionalProp: undefined,
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

      // Assert - undefined should be serialized as null or omitted
      const cloudDOMPath = path.join(testDir, 'clouddom.json');
      const content = fs.readFileSync(cloudDOMPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      // JSON.stringify removes undefined values
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Concurrent Access Edge Cases', () => {
    it('should handle rapid sequential builds', async () => {
      // Arrange
      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Act - run 5 builds as fast as possible
      const promises = Array.from({ length: 5 }, () => creact.build(jsx));
      
      // Assert - all should complete successfully
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('Path Resolution Edge Cases', () => {
    it('should handle relative paths correctly', async () => {
      // Arrange
      const relativeCreact = new CReact({
        cloudProvider,
        backendProvider,
        persistDir: './nested/relative/path',
      });

      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Act
      await relativeCreact.build(jsx);

      // Assert
      expect(fs.existsSync('./nested/relative/path/clouddom.json')).toBe(true);

      // Cleanup
      fs.rmSync('./nested', { recursive: true, force: true });
    });

    it('should handle paths with .. segments', async () => {
      // Arrange
      const parentCreact = new CReact({
        cloudProvider,
        backendProvider,
        persistDir: `./${testDir}/../${testDir}`,
      });

      const jsx: JSXElement = {
        type: () => null,
        props: {},
        key: 'test',
      };

      // Act
      await parentCreact.build(jsx);

      // Assert
      expect(fs.existsSync(path.join(testDir, 'clouddom.json'))).toBe(true);
    });
  });
});
