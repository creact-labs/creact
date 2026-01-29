/**
 * Reconciler - diff two sets of instance nodes with dependency ordering
 *
 * Key features:
 * - Path-based id for matching (unique per position in tree)
 * - Dependency graph from parent-child relationships
 * - Topological sort for correct deployment order
 * - Parallel batches for concurrent deployment
 */
import type { InstanceNode } from '../primitives/instance.js';
/**
 * Dependency graph
 */
export interface DependencyGraph {
    /** node → nodes it depends on (must be deployed first) */
    dependencies: Map<string, string[]>;
    /** node → nodes that depend on it (must wait for this) */
    dependents: Map<string, string[]>;
}
/**
 * Change set with deployment ordering
 */
export interface ChangeSet {
    creates: InstanceNode[];
    updates: InstanceNode[];
    deletes: InstanceNode[];
    /** Topologically sorted node IDs for deployment */
    deploymentOrder: string[];
    /** Groups of nodes that can be deployed in parallel */
    parallelBatches: string[][];
}
/**
 * Build dependency graph from nodes
 *
 * Dependencies are derived from the path hierarchy:
 * - Parent must be deployed before children
 * - Node with path ['App', 'DB', 'Cache'] depends on ['App', 'DB']
 */
export declare function buildDependencyGraph(nodes: InstanceNode[]): DependencyGraph;
/**
 * Topological sort using Kahn's algorithm
 *
 * Returns node IDs in deployment order (dependencies first)
 */
export declare function topologicalSort(nodeIds: string[], graph: DependencyGraph): string[];
/**
 * Compute parallel batches from deployment order
 *
 * Nodes that don't depend on each other can be deployed in parallel.
 * Each batch contains nodes that can be deployed concurrently.
 */
export declare function computeParallelBatches(deploymentOrder: string[], graph: DependencyGraph): string[][];
/**
 * Reconcile previous and current instance nodes
 * Uses path-based id for matching - each node has unique position in tree
 */
export declare function reconcile(previous: InstanceNode[], current: InstanceNode[]): ChangeSet;
/**
 * Deep equality check
 */
export declare function deepEqual(a: any, b: any): boolean;
/**
 * Check if there are new nodes that weren't in previous
 * Uses id for matching consistency with reconcile()
 */
export declare function hasNewNodes(previous: InstanceNode[], current: InstanceNode[]): boolean;
