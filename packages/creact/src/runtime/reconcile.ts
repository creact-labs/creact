/**
 * Reconciler - diff two sets of instance nodes with dependency ordering
 *
 * Key features:
 * - Path-based id for matching (unique per position in tree)
 * - Dependency graph from parent-child relationships
 * - Topological sort for correct deployment order
 * - Parallel batches for concurrent deployment
 */

import { plainObjectsEqualWith } from "./plain-objects-equal";

/**
 * The structural surface reconciliation needs: identity, tree position,
 * props for diffing, and (for deletes) the teardown handle. Both live
 * ReconcilableNode snapshots and persisted SerializedNodes satisfy it.
 */
export interface ReconcilableNode {
  id: string;
  path: string[];
  props: Record<string, unknown>;
  cleanupFn?: () => void | Promise<void>;
}

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
  creates: ReconcilableNode[];
  updates: ReconcilableNode[];
  deletes: ReconcilableNode[];
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
export function buildDependencyGraph(nodes: ReconcilableNode[]): DependencyGraph {
  const dependencies = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();
  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const node of nodes) {
    dependencies.set(node.id, []);
    dependents.set(node.id, []);
  }

  for (const node of nodes) {
    // Find parent in the path
    if (node.path.length > 1) {
      // Try to find a parent node in the graph
      // Walk up the path to find the nearest ancestor that's a node
      for (let i = node.path.length - 2; i >= 0; i--) {
        const parentPath = node.path.slice(0, i + 1);
        const parentId = parentPath.join(".");

        if (nodeIds.has(parentId)) {
          // Add dependency: node depends on parent
          dependencies.get(node.id)?.push(parentId);
          // Add dependent: parent has node as dependent
          dependents.get(parentId)?.push(node.id);
          break; // Only direct parent dependency
        }
      }
    }
  }

  return { dependencies, dependents };
}

/**
 * Topological sort using Kahn's algorithm
 *
 * Returns node IDs in deployment order (dependencies first)
 */
export function topologicalSort(
  nodeIds: string[],
  graph: DependencyGraph,
): string[] {
  const result: string[] = [];
  const inDegree = initInDegrees(nodeIds, graph);
  const queue = nodeIds.filter((id) => inDegree.get(id) === 0);

  // Process nodes with no remaining dependencies
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    // Reduce in-degree for dependents
    const deps = graph.dependents.get(current) ?? [];
    for (const dep of deps) {
      if (!inDegree.has(dep)) continue; // Not in our set

      const newDegree = inDegree.get(dep)! - 1;
      inDegree.set(dep, newDegree);

      if (newDegree === 0) {
        queue.push(dep);
      }
    }
  }

  appendCycleRemainder(nodeIds, result);
  return result;
}

/** In-degree per node, counting only dependencies inside the sorted set */
function initInDegrees(
  nodeIds: string[],
  graph: DependencyGraph,
): Map<string, number> {
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    const deps = graph.dependencies.get(id) ?? [];
    const relevantDeps = deps.filter((d) => nodeIds.includes(d));
    inDegree.set(id, relevantDeps.length);
  }
  return inDegree;
}

/** Nodes stuck in a cycle are warned about and appended at the end */
function appendCycleRemainder(nodeIds: string[], result: string[]): void {
  if (result.length === nodeIds.length) return;

  const remaining = nodeIds.filter((id) => !result.includes(id));
  if (remaining.length > 0) {
    console.warn("Circular dependency detected. Remaining nodes:", remaining);
    result.push(...remaining);
  }
}

/**
 * Compute parallel batches from deployment order
 *
 * Nodes that don't depend on each other can be deployed in parallel.
 * Each batch contains nodes that can be deployed concurrently.
 */
export function computeParallelBatches(
  deploymentOrder: string[],
  graph: DependencyGraph,
): string[][] {
  const batches: string[][] = [];
  const deployed = new Set<string>();

  for (const nodeId of deploymentOrder) {
    // Find which batch this node can go in
    const deps = graph.dependencies.get(nodeId) ?? [];
    const relevantDeps = deps.filter((d) => deploymentOrder.includes(d));

    // Find the latest batch that contains a dependency
    let batchIndex = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (batch?.some((id) => relevantDeps.includes(id))) {
        batchIndex = i + 1;
      }
    }

    // Create new batch if needed
    while (batches.length <= batchIndex) {
      batches.push([]);
    }

    batches[batchIndex]?.push(nodeId);
    deployed.add(nodeId);
  }

  return batches;
}

/**
 * Reconcile previous and current instance nodes
 * Uses path-based id for matching - each node has unique position in tree
 */
export function reconcile(
  previous: ReconcilableNode[],
  current: ReconcilableNode[],
): ChangeSet {
  // Use path-based id for matching (unique per position in tree)
  const prevMap = new Map(previous.map((n) => [n.id, n]));
  const currMap = new Map(current.map((n) => [n.id, n]));

  const creates: ReconcilableNode[] = [];
  const updates: ReconcilableNode[] = [];
  const deletes: ReconcilableNode[] = [];

  // Find creates and updates
  for (const node of current) {
    const prev = prevMap.get(node.id);
    if (!prev) {
      creates.push(node);
    } else if (!deepEqual(prev.props, node.props)) {
      updates.push(node);
    }
  }

  // Find deletes
  for (const node of previous) {
    if (!currMap.has(node.id)) {
      deletes.push(node);
    }
  }

  // Build dependency graph for current nodes
  const graph = buildDependencyGraph(current);

  // Get IDs of nodes that need deployment (creates + updates)
  const toDeployIds = [...creates, ...updates].map((n) => n.id);

  // Compute deployment order and parallel batches
  const deploymentOrder = topologicalSort(toDeployIds, graph);
  const parallelBatches = computeParallelBatches(deploymentOrder, graph);

  return {
    creates,
    updates,
    deletes,
    deploymentOrder,
    parallelBatches,
  };
}

/**
 * Deep equality check
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  // NaN is the only value not equal to itself
  if (typeof a === "number") {
    return Number.isNaN(a) && Number.isNaN(b as number);
  }

  if (typeof a === "object") {
    return objectsDeepEqual(a as object, b as object);
  }

  return false;
}

function objectsDeepEqual(a: object, b: object): boolean {
  const builtin = builtinsDeepEqual(a, b);
  if (builtin !== undefined) return builtin;

  if (Array.isArray(a) || Array.isArray(b)) return arraysDeepEqual(a, b);

  // Only plain objects compare by key walk. Arbitrary class instances
  // (Error, class Foo, …) may have no enumerable keys, so a key walk would
  // call unequal instances equal and skip a required prop update — compare
  // them by identity instead (=== already failed by this point).
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  return plainObjectsDeepEqual(
    a as Record<string, unknown>,
    b as Record<string, unknown>,
  );
}

/** An object whose prototype is Object.prototype or null */
function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Built-ins with no enumerable keys — compared by value, not by key walk.
 * Returns undefined when neither side is a comparable built-in.
 */
function builtinsDeepEqual(a: object, b: object): boolean | undefined {
  if (a instanceof Date || b instanceof Date) return datesEqual(a, b);
  if (a instanceof RegExp || b instanceof RegExp) return regExpsEqual(a, b);
  if (a instanceof Map || b instanceof Map) return mapsDeepEqual(a, b);
  if (a instanceof Set || b instanceof Set) return setsEqual(a, b);
  return undefined;
}

function datesEqual(a: object, b: object): boolean {
  return (
    a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
  );
}

function regExpsEqual(a: object, b: object): boolean {
  return (
    a instanceof RegExp &&
    b instanceof RegExp &&
    a.source === b.source &&
    a.flags === b.flags
  );
}

/**
 * Map keys compare by identity (SameValueZero, as Map.has does) while
 * values compare deeply. A Map keyed by recreated objects therefore
 * compares unequal — the safe direction: the prop counts as changed and
 * the handler re-runs.
 */
function mapsDeepEqual(a: object, b: object): boolean {
  if (!(a instanceof Map) || !(b instanceof Map)) return false;
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (!b.has(key) || !deepEqual(value, b.get(key))) return false;
  }
  return true;
}

/**
 * Set members compare by identity (SameValueZero, as Set.has does).
 * Sets of recreated objects therefore compare unequal — the safe
 * direction: the prop counts as changed and the handler re-runs.
 */
function setsEqual(a: object, b: object): boolean {
  if (!(a instanceof Set) || !(b instanceof Set)) return false;
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function arraysDeepEqual(a: object, b: object): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqual(a[i], b[i])) return false;
  }
  return true;
}

function plainObjectsDeepEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  return plainObjectsEqualWith(a, b, deepEqual);
}

/**
 * Find nodes in pending whose dependencies are all satisfied.
 * A dependency is satisfied if it's deployed, or not in pending/running
 * (i.e., it was already deployed in a prior pass or doesn't exist in this graph).
 */
export function getReadyNodes(
  pending: Set<string>,
  running: Set<string>,
  graph: DependencyGraph,
  deployed: Set<string>,
): string[] {
  const ready: string[] = [];
  for (const nodeId of pending) {
    const deps = graph.dependencies.get(nodeId) ?? [];
    const allSatisfied = deps.every(
      (d) => deployed.has(d) || (!pending.has(d) && !running.has(d)),
    );
    if (allSatisfied) ready.push(nodeId);
  }
  return ready;
}

/**
 * Check if there are new nodes that weren't in previous
 * Uses id for matching consistency with reconcile()
 */
export function hasNewNodes(
  previous: ReconcilableNode[],
  current: ReconcilableNode[],
): boolean {
  const prevIds = new Set(previous.map((n) => n.id));
  return current.some((n) => !prevIds.has(n.id));
}

/**
 * Check if there are removed nodes that aren't in current
 */
export function hasRemovedNodes(
  previous: ReconcilableNode[],
  current: ReconcilableNode[],
): boolean {
  const currIds = new Set(current.map((n) => n.id));
  return previous.some((n) => !currIds.has(n.id));
}

/**
 * Check if any existing nodes have changed props
 */
export function hasPropChanges(
  previous: ReconcilableNode[],
  current: ReconcilableNode[],
): boolean {
  const prevMap = new Map(previous.map((n) => [n.id, n]));
  for (const node of current) {
    const prev = prevMap.get(node.id);
    if (prev && !deepEqual(prev.props, node.props)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if there are any changes (new, removed, or prop changes)
 */
export function hasChanges(
  previous: ReconcilableNode[],
  current: ReconcilableNode[],
): boolean {
  return (
    hasNewNodes(previous, current) ||
    hasRemovedNodes(previous, current) ||
    hasPropChanges(previous, current)
  );
}
