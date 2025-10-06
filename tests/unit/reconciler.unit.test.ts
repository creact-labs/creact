// Unit tests for Reconciler - Testing internal helpers and algorithms
// Uses __testing__ API to test pure functions in isolation

import { describe, it, expect, beforeEach } from 'vitest';
import { Reconciler, ChangeSet, DependencyGraph } from '../../src/core/Reconciler';
import { CloudDOMNode } from '../../src/core/types';
import { ReconciliationError } from '../../src/core/errors';

// Mock construct classes
class S3Bucket {
  constructor(public props: any) {}
}

class Lambda {
  constructor(public props: any) {}
}

class ApiGateway {
  constructor(public props: any) {}
}

// Helper to create mock CloudDOM nodes
function createMockNode(
  id: string,
  construct: any,
  props: Record<string, any> = {},
  path: string[] = []
): CloudDOMNode {
  return {
    id,
    construct,
    props,
    path: path.length > 0 ? path : id.split('.'),
    children: [],
  };
}

describe('Reconciler Unit Tests', () => {
  let reconciler: Reconciler;

  beforeEach(() => {
    reconciler = new Reconciler();
  });

  describe('computeShallowHash', () => {
    it('should compute stable hash for identical props', () => {
      const props1 = { bucketName: 'my-bucket', region: 'us-east-1' };
      const props2 = { bucketName: 'my-bucket', region: 'us-east-1' };

      const hash1 = reconciler.__testing__.computeShallowHash(props1);
      const hash2 = reconciler.__testing__.computeShallowHash(props2);

      expect(hash1).toBe(hash2);
    });

    it('should compute different hash for different props', () => {
      const props1 = { bucketName: 'bucket-1' };
      const props2 = { bucketName: 'bucket-2' };

      const hash1 = reconciler.__testing__.computeShallowHash(props1);
      const hash2 = reconciler.__testing__.computeShallowHash(props2);

      expect(hash1).not.toBe(hash2);
    });

    it('should ignore key order (stable hash)', () => {
      const props1 = { a: 1, b: 2, c: 3 };
      const props2 = { c: 3, a: 1, b: 2 };

      const hash1 = reconciler.__testing__.computeShallowHash(props1);
      const hash2 = reconciler.__testing__.computeShallowHash(props2);

      expect(hash1).toBe(hash2);
    });

    it('should filter out metadata keys (starting with _)', () => {
      const props1 = { bucketName: 'my-bucket', _internal: 'metadata' };
      const props2 = { bucketName: 'my-bucket', _internal: 'different' };

      const hash1 = reconciler.__testing__.computeShallowHash(props1);
      const hash2 = reconciler.__testing__.computeShallowHash(props2);

      // Hashes should match because _internal is filtered out
      expect(hash1).toBe(hash2);
    });

    it('should handle nested objects', () => {
      const props1 = { config: { versioning: true, encryption: 'AES256' } };
      const props2 = { config: { versioning: true, encryption: 'AES256' } };

      const hash1 = reconciler.__testing__.computeShallowHash(props1);
      const hash2 = reconciler.__testing__.computeShallowHash(props2);

      expect(hash1).toBe(hash2);
    });

    it('should handle null and undefined', () => {
      const hash1 = reconciler.__testing__.computeShallowHash(null as any);
      const hash2 = reconciler.__testing__.computeShallowHash(undefined as any);

      expect(hash1).toBe('null');
      expect(hash2).toBe('null');
    });
  });

  describe('isMetadataKey', () => {
    it('should identify metadata keys starting with underscore', () => {
      expect(reconciler.__testing__.isMetadataKey('_internal')).toBe(true);
      expect(reconciler.__testing__.isMetadataKey('_propHash')).toBe(true);
      expect(reconciler.__testing__.isMetadataKey('_metadata')).toBe(true);
    });

    it('should not identify regular keys as metadata', () => {
      expect(reconciler.__testing__.isMetadataKey('bucketName')).toBe(false);
      expect(reconciler.__testing__.isMetadataKey('region')).toBe(false);
      expect(reconciler.__testing__.isMetadataKey('name')).toBe(false);
    });
  });

  describe('detectChangeType', () => {
    it('should detect no change for identical nodes', () => {
      const node1 = createMockNode('bucket', S3Bucket, { bucketName: 'my-bucket' });
      const node2 = createMockNode('bucket', S3Bucket, { bucketName: 'my-bucket' });

      const changeType = reconciler.__testing__.detectChangeType(node1, node2);

      expect(changeType).toBe('none');
    });

    it('should detect update when props change', () => {
      const node1 = createMockNode('bucket', S3Bucket, { bucketName: 'bucket-1' });
      const node2 = createMockNode('bucket', S3Bucket, { bucketName: 'bucket-2' });

      const changeType = reconciler.__testing__.detectChangeType(node1, node2);

      expect(changeType).toBe('update');
    });

    it('should detect replacement when construct changes', () => {
      const node1 = createMockNode('resource', S3Bucket, { name: 'test' });
      const node2 = createMockNode('resource', Lambda, { name: 'test' });

      const changeType = reconciler.__testing__.detectChangeType(node1, node2);

      expect(changeType).toBe('replacement');
    });

    it('should use hash-based fast path for identical props', () => {
      const props = {
        bucketName: 'my-bucket',
        tags: { env: 'prod', team: 'platform' },
        config: { versioning: true },
      };

      const node1 = createMockNode('bucket', S3Bucket, props);
      const node2 = createMockNode('bucket', S3Bucket, props);

      // Pre-compute hashes
      (node1 as any)._propHash = reconciler.__testing__.computeShallowHash(props);
      (node2 as any)._propHash = reconciler.__testing__.computeShallowHash(props);

      const changeType = reconciler.__testing__.detectChangeType(node1, node2);

      expect(changeType).toBe('none');
    });

    it('should ignore metadata keys in prop comparison', () => {
      const node1 = createMockNode('bucket', S3Bucket, {
        bucketName: 'my-bucket',
        _internal: 'metadata1',
      });
      const node2 = createMockNode('bucket', S3Bucket, {
        bucketName: 'my-bucket',
        _internal: 'metadata2',
      });

      const changeType = reconciler.__testing__.detectChangeType(node1, node2);

      // Should be 'none' because _internal is ignored
      expect(changeType).toBe('none');
    });
  });

  describe('extractDependencies', () => {
    it('should extract explicit dependsOn dependencies', () => {
      const node = createMockNode('lambda', Lambda, {
        functionName: 'my-function',
        dependsOn: 'bucket',
      });

      const nodeIds = new Set(['bucket', 'lambda']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);

      expect(deps).toEqual(['bucket']);
    });

    it('should extract array of dependsOn dependencies', () => {
      const node = createMockNode('api', ApiGateway, {
        apiName: 'my-api',
        dependsOn: ['bucket', 'lambda'],
      });

      const nodeIds = new Set(['bucket', 'lambda', 'api']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);

      expect(deps).toContain('bucket');
      expect(deps).toContain('lambda');
    });

    it('should extract ref prop as dependency', () => {
      const node = createMockNode('lambda', Lambda, {
        functionName: 'my-function',
        ref: 'bucket',
      });

      const nodeIds = new Set(['bucket', 'lambda']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);

      expect(deps).toContain('bucket');
    });

    it('should extract implicit dependencies from prop values', () => {
      const node = createMockNode('lambda', Lambda, {
        functionName: 'my-function',
        environment: {
          BUCKET_ID: 'bucket',
        },
      });

      const nodeIds = new Set(['bucket', 'lambda']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);

      expect(deps).toContain('bucket');
    });

    it('should not extract self-references', () => {
      const node = createMockNode('lambda', Lambda, {
        functionName: 'my-function',
        dependsOn: 'lambda',
      });

      const nodeIds = new Set(['lambda']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);

      expect(deps).toEqual([]);
    });

    it('should skip metadata keys', () => {
      const node = createMockNode('lambda', Lambda, {
        functionName: 'my-function',
        _internal: 'bucket', // Should be ignored
      });

      const nodeIds = new Set(['bucket', 'lambda']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);

      expect(deps).toEqual([]);
    });

    it('should skip known non-ID props', () => {
      const node = createMockNode('lambda', Lambda, {
        name: 'bucket', // 'name' is known non-ID prop
        description: 'lambda', // 'description' is known non-ID prop
      });

      const nodeIds = new Set(['bucket', 'lambda']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);

      expect(deps).toEqual([]);
    });

    it('should handle nested arrays', () => {
      const node = createMockNode('api', ApiGateway, {
        apiName: 'my-api',
        integrations: [{ target: 'lambda1' }, { target: 'lambda2' }],
      });

      const nodeIds = new Set(['lambda1', 'lambda2', 'api']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);

      expect(deps).toContain('lambda1');
      expect(deps).toContain('lambda2');
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build graph for independent nodes', () => {
      const nodes = [
        createMockNode('bucket1', S3Bucket, { bucketName: 'bucket-1' }),
        createMockNode('bucket2', S3Bucket, { bucketName: 'bucket-2' }),
      ];

      const graph = reconciler.__testing__.buildDependencyGraph(nodes);

      expect(graph.dependencies.get('bucket1')).toEqual([]);
      expect(graph.dependencies.get('bucket2')).toEqual([]);
    });

    it('should build graph with explicit dependencies', () => {
      const nodes = [
        createMockNode('bucket', S3Bucket, { bucketName: 'my-bucket' }),
        createMockNode('lambda', Lambda, {
          functionName: 'my-function',
          dependsOn: 'bucket',
        }),
      ];

      const graph = reconciler.__testing__.buildDependencyGraph(nodes);

      expect(graph.dependencies.get('bucket')).toEqual([]);
      expect(graph.dependencies.get('lambda')).toEqual(['bucket']);
      expect(graph.dependents.get('bucket')).toEqual(['lambda']);
    });

    it('should build graph with implicit dependencies', () => {
      const nodes = [
        createMockNode('bucket', S3Bucket, { bucketName: 'my-bucket' }),
        createMockNode('lambda', Lambda, {
          functionName: 'my-function',
          environment: { BUCKET: 'bucket' },
        }),
      ];

      const graph = reconciler.__testing__.buildDependencyGraph(nodes);

      expect(graph.dependencies.get('lambda')).toContain('bucket');
      expect(graph.dependents.get('bucket')).toContain('lambda');
    });

    it('should throw on circular dependencies', () => {
      const nodes = [
        createMockNode('node1', S3Bucket, { dependsOn: 'node2' }),
        createMockNode('node2', Lambda, { dependsOn: 'node1' }),
      ];

      expect(() => {
        reconciler.__testing__.buildDependencyGraph(nodes);
      }).toThrow(ReconciliationError);

      expect(() => {
        reconciler.__testing__.buildDependencyGraph(nodes);
      }).toThrow(/Circular dependencies detected/);
    });

    it('should silently ignore missing dependencies during extraction', () => {
      const nodes = [
        createMockNode('lambda', Lambda, {
          functionName: 'my-function',
          dependsOn: 'missing-bucket',
        }),
      ];

      // Missing dependencies are filtered out during extraction
      // so they don't appear in the graph
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);

      expect(graph.dependencies.get('lambda')).toEqual([]);
    });
  });

  describe('topologicalSort', () => {
    it('should sort independent nodes deterministically', () => {
      const graph: DependencyGraph = {
        dependencies: new Map([
          ['bucket1', []],
          ['bucket2', []],
          ['bucket3', []],
        ]),
        dependents: new Map([
          ['bucket1', []],
          ['bucket2', []],
          ['bucket3', []],
        ]),
      };

      const sorted = reconciler.__testing__.topologicalSort(graph);

      expect(sorted).toHaveLength(3);
      expect(sorted).toContain('bucket1');
      expect(sorted).toContain('bucket2');
      expect(sorted).toContain('bucket3');
      // Should be sorted alphabetically for determinism
      expect(sorted).toEqual(['bucket1', 'bucket2', 'bucket3']);
    });

    it('should sort linear dependency chain', () => {
      const graph: DependencyGraph = {
        dependencies: new Map([
          ['bucket', []],
          ['lambda', ['bucket']],
          ['api', ['lambda']],
        ]),
        dependents: new Map([
          ['bucket', ['lambda']],
          ['lambda', ['api']],
          ['api', []],
        ]),
      };

      const sorted = reconciler.__testing__.topologicalSort(graph);

      expect(sorted).toEqual(['bucket', 'lambda', 'api']);
    });

    it('should sort diamond dependency pattern', () => {
      const graph: DependencyGraph = {
        dependencies: new Map([
          ['root', []],
          ['left', ['root']],
          ['right', ['root']],
          ['bottom', ['left', 'right']],
        ]),
        dependents: new Map([
          ['root', ['left', 'right']],
          ['left', ['bottom']],
          ['right', ['bottom']],
          ['bottom', []],
        ]),
      };

      const sorted = reconciler.__testing__.topologicalSort(graph);

      // root must come first
      expect(sorted[0]).toBe('root');
      // bottom must come last
      expect(sorted[3]).toBe('bottom');
      // left and right can be in any order but should be sorted
      expect(sorted.slice(1, 3).sort()).toEqual(['left', 'right']);
    });

    it('should handle complex dependency graph', () => {
      const graph: DependencyGraph = {
        dependencies: new Map([
          ['a', []],
          ['b', ['a']],
          ['c', ['a']],
          ['d', ['b', 'c']],
          ['e', ['c']],
          ['f', ['d', 'e']],
        ]),
        dependents: new Map([
          ['a', ['b', 'c']],
          ['b', ['d']],
          ['c', ['d', 'e']],
          ['d', ['f']],
          ['e', ['f']],
          ['f', []],
        ]),
      };

      const sorted = reconciler.__testing__.topologicalSort(graph);

      // Verify all nodes are present
      expect(sorted).toHaveLength(6);

      // Verify ordering constraints
      expect(sorted.indexOf('a')).toBeLessThan(sorted.indexOf('b'));
      expect(sorted.indexOf('a')).toBeLessThan(sorted.indexOf('c'));
      expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('d'));
      expect(sorted.indexOf('c')).toBeLessThan(sorted.indexOf('d'));
      expect(sorted.indexOf('c')).toBeLessThan(sorted.indexOf('e'));
      expect(sorted.indexOf('d')).toBeLessThan(sorted.indexOf('f'));
      expect(sorted.indexOf('e')).toBeLessThan(sorted.indexOf('f'));
    });
  });

  describe('computeParallelBatches', () => {
    it('should create single batch for independent nodes', () => {
      const deploymentOrder = ['bucket1', 'bucket2', 'bucket3'];
      const graph: DependencyGraph = {
        dependencies: new Map([
          ['bucket1', []],
          ['bucket2', []],
          ['bucket3', []],
        ]),
        dependents: new Map([
          ['bucket1', []],
          ['bucket2', []],
          ['bucket3', []],
        ]),
      };

      const batches = reconciler.__testing__.computeParallelBatches(deploymentOrder, graph);

      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(3);
      expect(batches[0]).toEqual(['bucket1', 'bucket2', 'bucket3']);
    });

    it('should create separate batches for linear chain', () => {
      const deploymentOrder = ['bucket', 'lambda', 'api'];
      const graph: DependencyGraph = {
        dependencies: new Map([
          ['bucket', []],
          ['lambda', ['bucket']],
          ['api', ['lambda']],
        ]),
        dependents: new Map([
          ['bucket', ['lambda']],
          ['lambda', ['api']],
          ['api', []],
        ]),
      };

      const batches = reconciler.__testing__.computeParallelBatches(deploymentOrder, graph);

      expect(batches).toHaveLength(3);
      expect(batches[0]).toEqual(['bucket']);
      expect(batches[1]).toEqual(['lambda']);
      expect(batches[2]).toEqual(['api']);
    });

    it('should batch nodes at same depth', () => {
      const deploymentOrder = ['root', 'left', 'right', 'bottom'];
      const graph: DependencyGraph = {
        dependencies: new Map([
          ['root', []],
          ['left', ['root']],
          ['right', ['root']],
          ['bottom', ['left', 'right']],
        ]),
        dependents: new Map([
          ['root', ['left', 'right']],
          ['left', ['bottom']],
          ['right', ['bottom']],
          ['bottom', []],
        ]),
      };

      const batches = reconciler.__testing__.computeParallelBatches(deploymentOrder, graph);

      expect(batches).toHaveLength(3);
      expect(batches[0]).toEqual(['root']);
      expect(batches[1].sort()).toEqual(['left', 'right']);
      expect(batches[2]).toEqual(['bottom']);
    });
  });

  describe('detectMoves', () => {
    it('should detect when node moves between parents', () => {
      const previousMap = new Map([
        ['parent1.child', createMockNode('parent1.child', Lambda, {}, ['parent1', 'child'])],
      ]);

      const currentMap = new Map([
        ['parent2.child', createMockNode('parent2.child', Lambda, {}, ['parent2', 'child'])],
      ]);

      // Note: In real scenario, the ID would stay the same but path changes
      // For this test, we're simulating the detection logic
      const moves = reconciler.__testing__.detectMoves(previousMap, currentMap);

      // This test shows the limitation - moves are detected by ID match with path change
      // Since IDs are different here, no move is detected
      expect(moves).toHaveLength(0);
    });

    it('should detect move when same ID has different parent path', () => {
      const previousMap = new Map([
        ['child', createMockNode('child', Lambda, {}, ['parent1', 'child'])],
      ]);

      const currentMap = new Map([
        ['child', createMockNode('child', Lambda, {}, ['parent2', 'child'])],
      ]);

      const moves = reconciler.__testing__.detectMoves(previousMap, currentMap);

      expect(moves).toHaveLength(1);
      expect(moves[0].nodeId).toBe('child');
      expect(moves[0].from).toBe('parent1');
      expect(moves[0].to).toBe('parent2');
    });

    it('should not detect move when path is unchanged', () => {
      const previousMap = new Map([
        ['child', createMockNode('child', Lambda, {}, ['parent', 'child'])],
      ]);

      const currentMap = new Map([
        ['child', createMockNode('child', Lambda, {}, ['parent', 'child'])],
      ]);

      const moves = reconciler.__testing__.detectMoves(previousMap, currentMap);

      expect(moves).toHaveLength(0);
    });
  });

  describe('validateGraph', () => {
    it('should validate graph with all dependencies present', () => {
      const graph: DependencyGraph = {
        dependencies: new Map([
          ['bucket', []],
          ['lambda', ['bucket']],
        ]),
        dependents: new Map([
          ['bucket', ['lambda']],
          ['lambda', []],
        ]),
      };

      expect(() => {
        reconciler.__testing__.validateGraph(graph);
      }).not.toThrow();
    });

    it('should throw on missing dependency', () => {
      const graph: DependencyGraph = {
        dependencies: new Map([['lambda', ['missing-bucket']]]),
        dependents: new Map([['lambda', []]]),
      };

      expect(() => {
        reconciler.__testing__.validateGraph(graph);
      }).toThrow(ReconciliationError);

      expect(() => {
        reconciler.__testing__.validateGraph(graph);
      }).toThrow(/Missing dependency/);
    });
  });
});
