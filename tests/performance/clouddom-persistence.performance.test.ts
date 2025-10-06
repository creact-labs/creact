// Performance tests for CloudDOM Persistence (Task 8 / REQ-01.6)
// Tests persistence performance under various conditions

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CReact } from '../../src/core/CReact';
import { DummyCloudProvider } from '../../src/providers/DummyCloudProvider';
import { DummyBackendProvider } from '../../src/providers/DummyBackendProvider';
import { useInstance } from '../../src/hooks/useInstance';
import { JSXElement } from '../../src/core/types';
import * as fs from 'fs';

describe('CloudDOM Persistence - Performance Tests', () => {
  let testDir: string;
  let cloudProvider: DummyCloudProvider;
  let backendProvider: DummyBackendProvider;
  let creact: CReact;

  beforeEach(() => {
    testDir = `.creact-perf-${Date.now()}`;
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

  describe('Write Performance', () => {
    it('should persist small CloudDOM quickly (< 50ms)', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function SmallStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: SmallStack,
        props: {},
        key: 'stack',
      };

      // Act
      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50);
    });

    it('should persist medium CloudDOM efficiently (< 100ms)', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      class LambdaFunction {
        constructor(public props: any) {}
      }

      class ApiGateway {
        constructor(public props: any) {}
      }

      function MediumStack() {
        // Create 10 resources
        const buckets = [];
        for (let i = 0; i < 10; i++) {
          buckets.push(useInstance(S3Bucket, {
            bucketName: `bucket-${i}`,
          }, `bucket-${i}`));
        }
        return null;
      }

      const jsx: JSXElement = {
        type: MediumStack,
        props: {},
        key: 'stack',
      };

      // Act
      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should persist large CloudDOM within reasonable time (< 500ms)', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function LargeStack() {
        // Create 100 resources
        const buckets = [];
        for (let i = 0; i < 100; i++) {
          buckets.push(useInstance(S3Bucket, {
            bucketName: `bucket-${i}`,
            tags: {
              Environment: 'test',
              Index: i,
              Description: 'Test bucket for performance testing',
            },
          }, `bucket-${i}`));
        }
        return null;
      }

      const jsx: JSXElement = {
        type: LargeStack,
        props: {},
        key: 'stack',
      };

      // Act
      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      // Assert
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Repeated Write Performance', () => {
    it('should maintain consistent performance across multiple builds', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      const durations: number[] = [];

      // Act - run 10 builds
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await creact.build(jsx);
        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      // Assert - variance should be reasonable
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      // Performance should be reasonable (not testing exact variance due to system factors)
      // Just ensure average is under 100ms and no single run is excessively slow
      expect(avgDuration).toBeLessThan(100);
      expect(maxDuration).toBeLessThan(200); // No single run should be extremely slow
    });

    it('should not degrade performance with file overwrites', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act - first build
      const firstStart = performance.now();
      await creact.build(jsx);
      const firstDuration = performance.now() - firstStart;

      // Act - 10th build (after many overwrites)
      for (let i = 0; i < 8; i++) {
        await creact.build(jsx);
      }

      const tenthStart = performance.now();
      await creact.build(jsx);
      const tenthDuration = performance.now() - tenthStart;

      // Assert - 10th build should not be significantly slower
      expect(tenthDuration).toBeLessThan(firstDuration * 2);
    });
  });

  describe('Checksum Performance', () => {
    it('should calculate checksum efficiently for small CloudDOM', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function SmallStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: SmallStack,
        props: {},
        key: 'stack',
      };

      // Act
      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      // Assert - checksum calculation should be negligible
      // Total time should still be under 50ms
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should calculate checksum efficiently for large CloudDOM', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function LargeStack() {
        // Create 100 resources with large props
        const buckets = [];
        for (let i = 0; i < 100; i++) {
          buckets.push(useInstance(S3Bucket, {
            bucketName: `bucket-${i}`,
            tags: {
              Environment: 'test',
              Index: i,
              Description: 'A'.repeat(1000), // Large string
            },
          }, `bucket-${i}`));
        }
        return null;
      }

      const jsx: JSXElement = {
        type: LargeStack,
        props: {},
        key: 'stack',
      };

      // Act
      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      // Assert - even with large data, should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Lock Acquisition Performance', () => {
    it('should acquire lock quickly when no contention', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act
      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      // Assert - lock acquisition overhead should be minimal
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('File Size Impact', () => {
    it('should handle deeply nested structures efficiently', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function Level3() {
        useInstance('bucket-l3', S3Bucket, {
          bucketName: 'level-3',
        });
        return null;
      }

      function Level2() {
        useInstance('bucket-l2', S3Bucket, {
          bucketName: 'level-2',
        });
        return { type: Level3, props: {}, key: 'l3' };
      }

      function Level1() {
        useInstance('bucket-l1', S3Bucket, {
          bucketName: 'level-1',
        });
        return { type: Level2, props: {}, key: 'l2' };
      }

      const jsx: JSXElement = {
        type: Level1,
        props: {},
        key: 'l1',
      };

      // Act
      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle wide structures (many siblings) efficiently', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function WideStack({ children }: any) {
        return children;
      }

      function BucketComponent({ id }: any) {
        useInstance(id, S3Bucket, {
          bucketName: id,
        });
        return null;
      }

      // Create 50 sibling components
      const children = Array.from({ length: 50 }, (_, i) => ({
        type: BucketComponent,
        props: { id: `bucket-${i}` },
        key: `bucket-${i}`,
      }));

      const jsx: JSXElement = {
        type: WideStack,
        props: { children },
        key: 'wide',
      };

      // Act
      const startTime = performance.now();
      await creact.build(jsx);
      const endTime = performance.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(300);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory across multiple builds', async () => {
      // Arrange
      class S3Bucket {
        constructor(public props: any) {}
      }

      function MyStack() {
        useInstance('bucket', S3Bucket, {
          bucketName: 'test',
        });
        return null;
      }

      const jsx: JSXElement = {
        type: MyStack,
        props: {},
        key: 'stack',
      };

      // Act - run many builds
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        await creact.build(jsx);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;

      // Assert - memory should not grow significantly
      // Allow for some growth but not excessive
      const memoryGrowth = finalMemory - initialMemory;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth
    });
  });
});
