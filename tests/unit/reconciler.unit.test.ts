// Unit tests for Reconciler
// REQ-O01, REQ-O04: Test diff algorithm, dependency graph, and deployment ordering

import { describe, it, expect, beforeEach } from 'vitest';
import { Reconciler } from '../../src/core/Reconciler';
import { CloudDOMNode } from '../../src/core/types';
import { ReconciliationError } from '../../src/core/errors';

describe('Reconciler', () => {
  let reconciler: Reconciler;
  
  beforeEach(() => {
    reconciler = new Reconciler();
  });
  
  describe('reconcile - basic diff operations', () => {
    it('should detect creates (nodes in current but not in previous)', () => {
      const previous: CloudDOMNode[] = [];
      const current: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'TestConstruct' },
          props: { name: 'test' },
          children: [],
        },
      ];
      
      const changeSet = reconciler.reconcile(previous, current);
      
      expect(changeSet.creates).toHaveLength(1);
      expect(changeSet.creates[0].id).toBe('node1');
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
      expect(changeSet.replacements).toHaveLength(0);
    });
    
    it('should detect deletes (nodes in previous but not in current)', () => {
      const previous: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'TestConstruct' },
          props: { name: 'test' },
          children: [],
        },
      ];
      const current: CloudDOMNode[] = [];
      
      const changeSet = reconciler.reconcile(previous, current);
      
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(1);
      expect(changeSet.deletes[0].id).toBe('node1');
      expect(changeSet.replacements).toHaveLength(0);
    });
    
    it('should detect updates (nodes with changed props)', () => {
      const previous: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'TestConstruct' },
          props: { name: 'test', value: 1 },
          children: [],
        },
      ];
      const current: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'TestConstruct' },
          props: { name: 'test', value: 2 },
          children: [],
        },
      ];
      
      const changeSet = reconciler.reconcile(previous, current);
      
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(1);
      expect(changeSet.updates[0].id).toBe('node1');
      expect(changeSet.deletes).toHaveLength(0);
      expect(changeSet.replacements).toHaveLength(0);
    });
    
    it('should detect replacements (nodes with changed construct type)', () => {
      const previous: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'OldConstruct' },
          props: { name: 'test' },
          children: [],
        },
      ];
      const current: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'NewConstruct' },
          props: { name: 'test' },
          children: [],
        },
      ];
      
      const changeSet = reconciler.reconcile(previous, current);
      
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
      expect(changeSet.replacements).toHaveLength(1);
      expect(changeSet.replacements[0].id).toBe('node1');
    });
    
    it('should not detect changes when nodes are identical', () => {
      const previous: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'TestConstruct' },
          props: { name: 'test', value: 1 },
          children: [],
        },
      ];
      const current: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'TestConstruct' },
          props: { name: 'test', value: 1 },
          children: [],
        },
      ];
      
      const changeSet = reconciler.reconcile(previous, current);
      
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
      expect(changeSet.replacements).toHaveLength(0);
    });
    
    it('should ignore metadata props (starting with _) when detecting updates', () => {
      const previous: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'TestConstruct' },
          props: { name: 'test', _internal: 'old' },
          children: [],
        },
      ];
      const current: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'TestConstruct' },
          props: { name: 'test', _internal: 'new' },
          children: [],
        },
      ];
      
      const changeSet = reconciler.reconcile(previous, current);
      
      // Should not detect update since only metadata changed
      expect(changeSet.updates).toHaveLength(0);
    });
  });
  
  describe('reconcile - nested nodes', () => {
    it('should handle nested CloudDOM trees', () => {
      const previous: CloudDOMNode[] = [
        {
          id: 'parent',
          path: ['parent'],
          construct: { name: 'Parent' },
          props: {},
          children: [
            {
              id: 'parent.child',
              path: ['parent', 'child'],
              construct: { name: 'Child' },
              props: { value: 1 },
              children: [],
            },
          ],
        },
      ];
      
      const current: CloudDOMNode[] = [
        {
          id: 'parent',
          path: ['parent'],
          construct: { name: 'Parent' },
          props: {},
          children: [
            {
              id: 'parent.child',
              path: ['parent', 'child'],
              construct: { name: 'Child' },
              props: { value: 2 },
              children: [],
            },
          ],
        },
      ];
      
      const changeSet = reconciler.reconcile(previous, current);
      
      expect(changeSet.updates).toHaveLength(1);
      expect(changeSet.updates[0].id).toBe('parent.child');
    });
  });
  
  describe('detectChangeType - pure function tests', () => {
    it('should detect replacement when construct changes', () => {
      const previous: CloudDOMNode = {
        id: 'node1',
        path: ['node1'],
        construct: { name: 'OldConstruct' },
        props: { value: 1 },
        children: [],
      };
      
      const current: CloudDOMNode = {
        id: 'node1',
        path: ['node1'],
        construct: { name: 'NewConstruct' },
        props: { value: 1 },
        children: [],
      };
      
      const changeType = reconciler.__testing__.detectChangeType(previous, current);
      expect(changeType).toBe('replacement');
    });
    
    it('should detect update when props change', () => {
      const previous: CloudDOMNode = {
        id: 'node1',
        path: ['node1'],
        construct: { name: 'TestConstruct' },
        props: { value: 1 },
        children: [],
      };
      
      const current: CloudDOMNode = {
        id: 'node1',
        path: ['node1'],
        construct: { name: 'TestConstruct' },
        props: { value: 2 },
        children: [],
      };
      
      const changeType = reconciler.__testing__.detectChangeType(previous, current);
      expect(changeType).toBe('update');
    });
    
    it('should detect no change when nodes are identical', () => {
      const previous: CloudDOMNode = {
        id: 'node1',
        path: ['node1'],
        construct: { name: 'TestConstruct' },
        props: { value: 1 },
        children: [],
      };
      
      const current: CloudDOMNode = {
        id: 'node1',
        path: ['node1'],
        construct: { name: 'TestConstruct' },
        props: { value: 1 },
        children: [],
      };
      
      const changeType = reconciler.__testing__.detectChangeType(previous, current);
      expect(changeType).toBe('none');
    });
  });
  
  describe('buildDependencyGraph - pure function tests', () => {
    it('should build dependency graph from explicit dependsOn', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'node2',
          path: ['node2'],
          construct: { name: 'Test' },
          props: { dependsOn: 'node1' },
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      
      expect(graph.dependencies.get('node2')).toEqual(['node1']);
      expect(graph.dependents.get('node1')).toEqual(['node2']);
    });
    
    it('should handle multiple dependencies', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'node2',
          path: ['node2'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'node3',
          path: ['node3'],
          construct: { name: 'Test' },
          props: { dependsOn: ['node1', 'node2'] },
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      
      expect(graph.dependencies.get('node3')).toEqual(['node1', 'node2']);
    });
    
    it('should detect circular dependencies', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: { dependsOn: 'node2' },
          children: [],
        },
        {
          id: 'node2',
          path: ['node2'],
          construct: { name: 'Test' },
          props: { dependsOn: 'node1' },
          children: [],
        },
      ];
      
      expect(() => {
        reconciler.__testing__.buildDependencyGraph(nodes);
      }).toThrow(ReconciliationError);
    });
    
    it('should extract dependencies from ref prop', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'node2',
          path: ['node2'],
          construct: { name: 'Test' },
          props: { ref: 'node1' },
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      
      expect(graph.dependencies.get('node2')).toEqual(['node1']);
    });
    
    it('should extract implicit dependencies from nested prop values', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'database',
          path: ['database'],
          construct: { name: 'Database' },
          props: {},
          children: [],
        },
        {
          id: 'api',
          path: ['api'],
          construct: { name: 'API' },
          props: { config: { connectionString: 'database' } },
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      
      expect(graph.dependencies.get('api')).toContain('database');
    });
    
    it('should skip known non-ID props', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: { name: 'node2', description: 'node3' },
          children: [],
        },
        {
          id: 'node2',
          path: ['node2'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'node3',
          path: ['node3'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      
      // Should not detect dependencies since 'name' and 'description' are known non-ID props
      expect(graph.dependencies.get('node1')).toEqual([]);
    });
  });
  
  describe('topologicalSort - pure function tests', () => {
    it('should sort nodes in dependency order', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'c',
          path: ['c'],
          construct: { name: 'Test' },
          props: { dependsOn: 'b' },
          children: [],
        },
        {
          id: 'b',
          path: ['b'],
          construct: { name: 'Test' },
          props: { dependsOn: 'a' },
          children: [],
        },
        {
          id: 'a',
          path: ['a'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      const sorted = reconciler.__testing__.topologicalSort(graph);
      
      expect(sorted).toEqual(['a', 'b', 'c']);
    });
    
    it('should sort nodes with same depth by ID for determinism', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'node3',
          path: ['node3'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'node2',
          path: ['node2'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      const sorted = reconciler.__testing__.topologicalSort(graph);
      
      // All nodes have no dependencies, should be sorted alphabetically
      expect(sorted).toEqual(['node1', 'node2', 'node3']);
    });
    
    it('should handle diamond dependencies', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'a',
          path: ['a'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'b',
          path: ['b'],
          construct: { name: 'Test' },
          props: { dependsOn: 'a' },
          children: [],
        },
        {
          id: 'c',
          path: ['c'],
          construct: { name: 'Test' },
          props: { dependsOn: 'a' },
          children: [],
        },
        {
          id: 'd',
          path: ['d'],
          construct: { name: 'Test' },
          props: { dependsOn: ['b', 'c'] },
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      const sorted = reconciler.__testing__.topologicalSort(graph);
      
      // 'a' must come first, 'd' must come last
      expect(sorted[0]).toBe('a');
      expect(sorted[3]).toBe('d');
      // 'b' and 'c' can be in any order but must be between 'a' and 'd'
      expect(sorted.slice(1, 3).sort()).toEqual(['b', 'c']);
    });
  });
  
  describe('computeParallelBatches - pure function tests', () => {
    it('should group independent nodes into parallel batches', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'node2',
          path: ['node2'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'node3',
          path: ['node3'],
          construct: { name: 'Test' },
          props: { dependsOn: ['node1', 'node2'] },
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      const deploymentOrder = reconciler.__testing__.topologicalSort(graph);
      const batches = reconciler.__testing__.computeParallelBatches(deploymentOrder, graph);
      
      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(2); // node1, node2
      expect(batches[0].sort()).toEqual(['node1', 'node2']);
      expect(batches[1]).toEqual(['node3']);
    });
    
    it('should handle linear dependencies (no parallelism)', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'node2',
          path: ['node2'],
          construct: { name: 'Test' },
          props: { dependsOn: 'node1' },
          children: [],
        },
        {
          id: 'node3',
          path: ['node3'],
          construct: { name: 'Test' },
          props: { dependsOn: 'node2' },
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      const deploymentOrder = reconciler.__testing__.topologicalSort(graph);
      const batches = reconciler.__testing__.computeParallelBatches(deploymentOrder, graph);
      
      // Each node in its own batch (linear chain)
      expect(batches).toHaveLength(3);
      expect(batches[0]).toEqual(['node1']);
      expect(batches[1]).toEqual(['node2']);
      expect(batches[2]).toEqual(['node3']);
    });
    
    it('should handle complex dependency graphs', () => {
      const nodes: CloudDOMNode[] = [
        {
          id: 'a',
          path: ['a'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'b',
          path: ['b'],
          construct: { name: 'Test' },
          props: {},
          children: [],
        },
        {
          id: 'c',
          path: ['c'],
          construct: { name: 'Test' },
          props: { dependsOn: 'a' },
          children: [],
        },
        {
          id: 'd',
          path: ['d'],
          construct: { name: 'Test' },
          props: { dependsOn: 'b' },
          children: [],
        },
        {
          id: 'e',
          path: ['e'],
          construct: { name: 'Test' },
          props: { dependsOn: ['c', 'd'] },
          children: [],
        },
      ];
      
      const graph = reconciler.__testing__.buildDependencyGraph(nodes);
      const deploymentOrder = reconciler.__testing__.topologicalSort(graph);
      const batches = reconciler.__testing__.computeParallelBatches(deploymentOrder, graph);
      
      expect(batches).toHaveLength(3);
      // Batch 0: a, b (no dependencies)
      expect(batches[0].sort()).toEqual(['a', 'b']);
      // Batch 1: c, d (depend on batch 0)
      expect(batches[1].sort()).toEqual(['c', 'd']);
      // Batch 2: e (depends on batch 1)
      expect(batches[2]).toEqual(['e']);
    });
  });
  
  describe('extractDependencies - pure function tests', () => {
    it('should extract dependencies from explicit dependsOn array', () => {
      const node: CloudDOMNode = {
        id: 'node1',
        path: ['node1'],
        construct: { name: 'Test' },
        props: { dependsOn: ['node2', 'node3'] },
        children: [],
      };
      
      const nodeIds = new Set(['node1', 'node2', 'node3']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);
      
      expect(deps.sort()).toEqual(['node2', 'node3']);
    });
    
    it('should extract dependencies from ref prop', () => {
      const node: CloudDOMNode = {
        id: 'node1',
        path: ['node1'],
        construct: { name: 'Test' },
        props: { ref: 'node2' },
        children: [],
      };
      
      const nodeIds = new Set(['node1', 'node2']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);
      
      expect(deps).toEqual(['node2']);
    });
    
    it('should extract implicit dependencies from string values', () => {
      const node: CloudDOMNode = {
        id: 'api',
        path: ['api'],
        construct: { name: 'Test' },
        props: { database: 'db', cache: 'redis' },
        children: [],
      };
      
      const nodeIds = new Set(['api', 'db', 'redis']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);
      
      expect(deps.sort()).toEqual(['db', 'redis']);
    });
    
    it('should skip metadata props starting with underscore', () => {
      const node: CloudDOMNode = {
        id: 'node1',
        path: ['node1'],
        construct: { name: 'Test' },
        props: { _internal: 'node2', value: 'node3' },
        children: [],
      };
      
      const nodeIds = new Set(['node1', 'node2', 'node3']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);
      
      // Should only find node3, not node2 (metadata)
      expect(deps).toEqual(['node3']);
    });
    
    it('should not create self-dependencies', () => {
      const node: CloudDOMNode = {
        id: 'node1',
        path: ['node1'],
        construct: { name: 'Test' },
        props: { ref: 'node1' },
        children: [],
      };
      
      const nodeIds = new Set(['node1']);
      const deps = reconciler.__testing__.extractDependencies(node, nodeIds);
      
      expect(deps).toEqual([]);
    });
  });
  
  describe('edge cases', () => {
    it('should handle empty CloudDOM trees', () => {
      const changeSet = reconciler.reconcile([], []);
      
      expect(changeSet.creates).toHaveLength(0);
      expect(changeSet.updates).toHaveLength(0);
      expect(changeSet.deletes).toHaveLength(0);
      expect(changeSet.replacements).toHaveLength(0);
      expect(changeSet.deploymentOrder).toHaveLength(0);
      expect(changeSet.parallelBatches).toHaveLength(0);
    });
    
    it('should handle nodes with complex nested props', () => {
      const previous: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: {
            config: {
              nested: {
                value: 1,
                array: [1, 2, 3],
              },
            },
          },
          children: [],
        },
      ];
      
      const current: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: {
            config: {
              nested: {
                value: 2,
                array: [1, 2, 3],
              },
            },
          },
          children: [],
        },
      ];
      
      const changeSet = reconciler.reconcile(previous, current);
      
      expect(changeSet.updates).toHaveLength(1);
    });
    
    it('should handle nodes with array props', () => {
      const previous: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: { tags: ['a', 'b'] },
          children: [],
        },
      ];
      
      const current: CloudDOMNode[] = [
        {
          id: 'node1',
          path: ['node1'],
          construct: { name: 'Test' },
          props: { tags: ['a', 'b', 'c'] },
          children: [],
        },
      ];
      
      const changeSet = reconciler.reconcile(previous, current);
      
      expect(changeSet.updates).toHaveLength(1);
    });
  });
});
