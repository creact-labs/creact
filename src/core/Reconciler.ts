// REQ-O01, REQ-O04: Reconciler - CloudDOM diff algorithm
// Computes minimal change sets between CloudDOM states (like React Fiber's diff algorithm)

import { CloudDOMNode } from './types';
import { deepEqual } from '../utils/deepEqual';
import { ReconciliationError } from './errors';

/**
 * Type representing a construct (function, class, or string)
 */
export type ConstructLike = { name?: string } | Function | string;

/**
 * ChangeSet represents the minimal set of operations to reconcile two CloudDOM states
 *
 * REQ-O01: State Machine needs diff to detect changes
 * REQ-O04: Plan Command needs diff to show preview
 */
export interface ChangeSet {
  /** Nodes that exist in current but not in previous (need to be created) */
  creates: CloudDOMNode[];

  /** Nodes that exist in both but have different props (need to be updated) */
  updates: CloudDOMNode[];

  /** Nodes that exist in previous but not in current (need to be deleted) */
  deletes: CloudDOMNode[];

  /** Nodes that changed type (need to be replaced: delete + create) */
  replacements: CloudDOMNode[];

  /** Nodes that moved in the hierarchy (includes node ID for traceability) */
  moves: Array<{ nodeId: string; from: string; to: string }>;

  /** Deployment order based on dependency graph (topologically sorted) */
  deploymentOrder: string[];

  /** Parallel deployment batches (nodes at same depth can deploy in parallel) */
  parallelBatches: string[][];
}

/**
 * Helper function to get total number of changes from a ChangeSet
 * Single source of truth for change counting
 */
export function getTotalChanges(changeSet: ChangeSet): number {
  return (
    changeSet.creates.length +
    changeSet.updates.length +
    changeSet.deletes.length +
    changeSet.replacements.length +
    changeSet.moves.length
  );
}

/**
 * Helper function to check if a ChangeSet has any changes
 */
export function hasChanges(changeSet: ChangeSet): boolean {
  return getTotalChanges(changeSet) > 0;
}

/**
 * DependencyGraph represents resource dependencies for deployment ordering
 *
 * Maps node ID → array of dependency IDs
 */
export interface DependencyGraph {
  /** Adjacency list: node ID → dependency IDs */
  dependencies: Map<string, string[]>;

  /** Reverse adjacency list: node ID → dependent IDs (nodes that depend on this node) */
  dependents: Map<string, string[]>;
}

/**
 * Reconciler computes minimal change sets between CloudDOM states
 *
 * This is CReact's equivalent to React's Fiber reconciliation algorithm.
 * It enables:
 * - Incremental updates (only deploy what changed)
 * - Plan preview (show diff before deploy)
 * - Hot reload (apply deltas without full rebuild)
 * - Dependency-aware ordering (deploy in correct order)
 *
 * REQ-O01: CloudDOM State Machine
 * REQ-O04: Plan and Change Preview
 */
export class Reconciler {
  /**
   * Internal methods exposed for testing
   *
   * These are pure functions that are ideal for unit testing.
   * Prefixed with __ to indicate they're internal/testing-only.
   */
  public __testing__ = {
    buildDependencyGraph: this.buildDependencyGraph.bind(this),
    detectChangeType: this.detectChangeType.bind(this),
    computeParallelBatches: this.computeParallelBatches.bind(this),
    topologicalSort: this.topologicalSort.bind(this),
    extractDependencies: this.extractDependencies.bind(this),
    detectMoves: this.detectMoves.bind(this),
    validateGraph: this.validateGraph.bind(this),
    computeShallowHash: this.computeShallowHash.bind(this),
    isMetadataKey: this.isMetadataKey.bind(this),
  };

  /**
   * Generate a human-readable diff visualization for UI/CLI
   *
   * Formats the ChangeSet as JSON suitable for:
   * - CLI diff previews (like Terraform plans)
   * - Web UI diff visualization
   * - CI/CD pipeline reports
   *
   * @param changeSet - ChangeSet to visualize
   * @returns JSON-serializable diff visualization
   */
  public generateDiffVisualization(changeSet: ChangeSet): {
    summary: {
      creates: number;
      updates: number;
      deletes: number;
      replacements: number;
      moves: number;
      total: number;
    };
    changes: Array<{
      type: 'create' | 'update' | 'delete' | 'replacement' | 'move';
      nodeId: string;
      details?: any;
    }>;
    deployment: {
      order: string[];
      batches: Array<{
        depth: number;
        nodes: string[];
        parallelism: number;
      }>;
    };
  } {
    const changes: Array<{
      type: 'create' | 'update' | 'delete' | 'replacement' | 'move';
      nodeId: string;
      details?: any;
    }> = [];

    // Add creates
    for (const node of changeSet.creates) {
      changes.push({
        type: 'create',
        nodeId: node.id,
        details: {
          construct: this.getConstructName(node.construct),
          path: node.path,
        },
      });
    }

    // Add updates
    for (const node of changeSet.updates) {
      changes.push({
        type: 'update',
        nodeId: node.id,
        details: {
          construct: this.getConstructName(node.construct),
          path: node.path,
        },
      });
    }

    // Add deletes
    for (const node of changeSet.deletes) {
      changes.push({
        type: 'delete',
        nodeId: node.id,
        details: {
          construct: this.getConstructName(node.construct),
          path: node.path,
        },
      });
    }

    // Add replacements
    for (const node of changeSet.replacements) {
      changes.push({
        type: 'replacement',
        nodeId: node.id,
        details: {
          construct: this.getConstructName(node.construct),
          path: node.path,
        },
      });
    }

    // Add moves
    for (const move of changeSet.moves) {
      changes.push({
        type: 'move',
        nodeId: move.nodeId,
        details: {
          from: move.from,
          to: move.to,
        },
      });
    }

    // Format batches
    const batches = changeSet.parallelBatches.map((batch, index) => ({
      depth: index,
      nodes: batch,
      parallelism: batch.length,
    }));

    return {
      summary: {
        creates: changeSet.creates.length,
        updates: changeSet.updates.length,
        deletes: changeSet.deletes.length,
        replacements: changeSet.replacements.length,
        moves: changeSet.moves.length,
        total: changes.length,
      },
      changes,
      deployment: {
        order: changeSet.deploymentOrder,
        batches,
      },
    };
  }
  /**
   * Debug logging helper
   * Logs messages when CREACT_DEBUG environment variable is set
   *
   * Supports both string messages and structured data for telemetry.
   * Includes timestamps for async reconciliation tracing.
   */
  private log(message: string | Record<string, any>): void {
    if (process.env.CREACT_DEBUG === '1' || process.env.CREACT_DEBUG === 'true') {
      const time = new Date().toISOString();
      if (typeof message === 'string') {
        console.debug(`[${time}] [Reconciler] ${message}`);
      } else {
        console.debug(`[${time}] [Reconciler]`, JSON.stringify(message, null, 2));
      }
    }
  }

  /**
   * Check if a key is internal metadata (starts with underscore)
   *
   * Used for filtering metadata from prop comparisons and dependency scanning.
   *
   * @param key - Property key to check
   * @returns True if key is metadata
   */
  private isMetadataKey(key: string): boolean {
    return key.startsWith('_');
  }

  /**
   * Compute a shallow hash of props for fast equality checks
   *
   * Creates a stable, key-order-independent hash by:
   * - Filtering out metadata keys (starting with _)
   * - Sorting entries by key
   * - JSON stringifying the result
   *
   * This enables O(1) prop comparisons for unchanged nodes.
   *
   * @param props - Props object to hash
   * @returns Stable hash string
   */
  private computeShallowHash(props: Record<string, any>): string {
    if (!props || typeof props !== 'object') {
      return 'null';
    }

    const entries = Object.entries(props)
      .filter(([k]) => !this.isMetadataKey(k))
      .sort(([a], [b]) => a.localeCompare(b));

    try {
      return JSON.stringify(entries);
    } catch {
      // If serialization fails (circular refs, functions), use fallback
      return `hash:${Math.random()}`;
    }
  }

  /**
   * Reconcile two CloudDOM states and compute minimal change set
   *
   * Algorithm:
   * 1. Build ID maps for O(n) lookup
   * 2. Detect creates (in current, not in previous)
   * 3. Detect updates/replacements (in both, but props or construct changed)
   * 4. Detect deletes (in previous, not in current)
   * 5. Detect moves (nodes that changed parent)
   * 6. Build dependency graph from current nodes
   * 7. Compute topological sort for deployment order
   * 8. Group independent resources into parallel batches
   *
   * Performance notes:
   * - Synchronous for graphs <10k nodes
   * - For larger graphs, consider async version with periodic yielding
   * - Uses memoized deep equality for prop comparison
   *
   * REQ-O01: Diff algorithm for incremental updates
   * REQ-O04: Change preview for plan command
   *
   * @param previous - Previous CloudDOM state
   * @param current - Current CloudDOM state
   * @returns ChangeSet with creates, updates, deletes, replacements, and deployment order
   */
  reconcile(previous: CloudDOMNode[], current: CloudDOMNode[]): ChangeSet {
    this.log('Starting reconciliation');

    // Step 1: Build ID maps for O(n) lookup
    const previousMap = this.buildNodeMap(previous);
    const currentMap = this.buildNodeMap(current);

    this.log(`Previous: ${previousMap.size} nodes, Current: ${currentMap.size} nodes`);

    // Step 2: Detect creates (nodes in current but not in previous)
    const creates: CloudDOMNode[] = [];
    for (const [id, node] of currentMap) {
      if (!previousMap.has(id)) {
        creates.push(node);
      }
    }

    this.log(`Creates: ${creates.length} nodes`);

    // Step 3: Detect updates and replacements (nodes in both with changes)
    const updates: CloudDOMNode[] = [];
    const replacements: CloudDOMNode[] = [];

    for (const [id, currentNode] of currentMap) {
      const previousNode = previousMap.get(id);
      if (previousNode) {
        const changeType = this.detectChangeType(previousNode, currentNode);

        if (changeType === 'replacement') {
          // Construct type changed - needs replacement (delete + create)
          replacements.push(currentNode);
          this.log(`Replacement detected: ${id} (construct changed)`);
        } else if (changeType === 'update') {
          // Props changed but construct is same - can update in place
          updates.push(currentNode);
          this.log(`Update detected: ${id} (props changed)`);
        }
        // changeType === 'none' means no changes
      }
    }

    this.log(`Updates: ${updates.length} nodes, Replacements: ${replacements.length} nodes`);

    // Step 4: Detect deletes (nodes in previous but not in current)
    const deletes: CloudDOMNode[] = [];
    for (const [id, node] of previousMap) {
      if (!currentMap.has(id)) {
        deletes.push(node);
      }
    }

    this.log(`Deletes: ${deletes.length} nodes`);

    // Step 4.5: Detect moves (nodes that changed parent in hierarchy)
    const moves = this.detectMoves(previousMap, currentMap);
    this.log(`Moves: ${moves.length} nodes`);

    // Calculate unchanged nodes for idempotency verification
    const unchanged = currentMap.size - (creates.length + updates.length + replacements.length);
    this.log(`Unchanged: ${unchanged} nodes (idempotent)`);

    // Step 5: Build dependency graph from current nodes
    this.log('Building dependency graph');
    const graph = this.buildDependencyGraph(Array.from(currentMap.values()));

    // Step 6: Compute topological sort for deployment order
    this.log('Computing deployment order');
    const deploymentOrder = this.topologicalSort(graph);

    // Step 7: Compute parallel deployment batches
    this.log('Computing parallel batches');
    const parallelBatches = this.computeParallelBatches(deploymentOrder, graph);

    this.log(
      `Deployment order: ${deploymentOrder.length} nodes in ${parallelBatches.length} batches`
    );

    // Structured logging for telemetry/debugging
    this.log({
      phase: 'reconciliation_complete',
      summary: {
        creates: creates.length,
        updates: updates.length,
        deletes: deletes.length,
        replacements: replacements.length,
        unchanged,
        total: currentMap.size,
      },
      deployment: {
        order: deploymentOrder,
        batches: parallelBatches.length,
        maxParallelism: Math.max(...parallelBatches.map((b) => b.length), 0),
      },
    });

    return {
      creates,
      updates,
      deletes,
      replacements,
      moves,
      deploymentOrder,
      parallelBatches,
    };
  }

  /**
   * Async reconcile for large CloudDOM graphs (>10k nodes)
   *
   * Yields periodically to prevent blocking the event loop.
   * Useful for:
   * - Large infrastructure graphs
   * - UI responsiveness during diff computation
   * - Long-running CI/CD pipelines
   *
   * Algorithm is identical to synchronous reconcile, but yields every N nodes.
   *
   * @param previous - Previous CloudDOM state
   * @param current - Current CloudDOM state
   * @param yieldInterval - Number of nodes to process before yielding (default: 1000)
   * @returns Promise resolving to ChangeSet
   */
  async reconcileAsync(
    previous: CloudDOMNode[],
    current: CloudDOMNode[],
    yieldInterval: number = 1000
  ): Promise<ChangeSet> {
    this.log('Starting async reconciliation');

    // Step 1: Build ID maps for O(n) lookup
    const previousMap = this.buildNodeMap(previous);
    const currentMap = this.buildNodeMap(current);

    this.log(`Previous: ${previousMap.size} nodes, Current: ${currentMap.size} nodes`);

    // Step 2: Detect creates (with periodic yielding)
    const creates: CloudDOMNode[] = [];
    let processedCount = 0;

    for (const [id, node] of currentMap) {
      if (!previousMap.has(id)) {
        creates.push(node);
      }

      // Yield periodically to prevent blocking
      if (++processedCount % yieldInterval === 0) {
        await this.yield();
      }
    }

    this.log(`Creates: ${creates.length} nodes`);

    // Step 3: Detect updates and replacements (with periodic yielding)
    const updates: CloudDOMNode[] = [];
    const replacements: CloudDOMNode[] = [];
    processedCount = 0;

    for (const [id, currentNode] of currentMap) {
      const previousNode = previousMap.get(id);
      if (previousNode) {
        const changeType = this.detectChangeType(previousNode, currentNode);

        if (changeType === 'replacement') {
          replacements.push(currentNode);
          this.log(`Replacement detected: ${id} (construct changed)`);
        } else if (changeType === 'update') {
          updates.push(currentNode);
          this.log(`Update detected: ${id} (props changed)`);
        }
      }

      // Yield periodically
      if (++processedCount % yieldInterval === 0) {
        await this.yield();
      }
    }

    this.log(`Updates: ${updates.length} nodes, Replacements: ${replacements.length} nodes`);

    // Step 4: Detect deletes
    const deletes: CloudDOMNode[] = [];
    for (const [id, node] of previousMap) {
      if (!currentMap.has(id)) {
        deletes.push(node);
      }
    }

    this.log(`Deletes: ${deletes.length} nodes`);

    // Step 4.5: Detect moves
    const moves = this.detectMoves(previousMap, currentMap);
    this.log(`Moves: ${moves.length} nodes`);

    // Calculate unchanged nodes
    const unchanged = currentMap.size - (creates.length + updates.length + replacements.length);
    this.log(`Unchanged: ${unchanged} nodes (idempotent)`);

    // Step 5: Build dependency graph
    this.log('Building dependency graph');
    const graph = this.buildDependencyGraph(Array.from(currentMap.values()));

    // Step 6: Compute topological sort
    this.log('Computing deployment order');
    const deploymentOrder = this.topologicalSort(graph);

    // Step 7: Compute parallel batches
    this.log('Computing parallel batches');
    const parallelBatches = this.computeParallelBatches(deploymentOrder, graph);

    this.log(
      `Deployment order: ${deploymentOrder.length} nodes in ${parallelBatches.length} batches`
    );

    // Structured logging
    this.log({
      phase: 'async_reconciliation_complete',
      summary: {
        creates: creates.length,
        updates: updates.length,
        deletes: deletes.length,
        replacements: replacements.length,
        unchanged,
        total: currentMap.size,
      },
      deployment: {
        order: deploymentOrder,
        batches: parallelBatches.length,
        maxParallelism: Math.max(...parallelBatches.map((b) => b.length), 0),
      },
    });

    return {
      creates,
      updates,
      deletes,
      replacements,
      moves,
      deploymentOrder,
      parallelBatches,
    };
  }

  /**
   * Yield control to event loop
   *
   * Uses setImmediate in Node.js, setTimeout in browser.
   * Prevents blocking during large graph reconciliation.
   */
  private yield(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof setImmediate !== 'undefined') {
        setImmediate(resolve);
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * Build a flat map of node ID → CloudDOMNode for O(n) lookup
   *
   * Recursively walks the CloudDOM tree and collects all nodes.
   *
   * @param nodes - CloudDOM tree (root nodes)
   * @returns Map of node ID → CloudDOMNode
   */
  private buildNodeMap(nodes: CloudDOMNode[]): Map<string, CloudDOMNode> {
    const map = new Map<string, CloudDOMNode>();

    const walk = (node: CloudDOMNode) => {
      map.set(node.id, node);
      if (node.children && node.children.length > 0) {
        node.children.forEach(walk);
      }
    };

    nodes.forEach(walk);
    return map;
  }

  /**
   * Detect moves (nodes that changed parent in hierarchy)
   *
   * A move is detected when:
   * - Node exists in both previous and current
   * - Node's parent path changed (using array equality, not string comparison)
   *
   * This is useful for hierarchical updates where resources move
   * between parent containers.
   *
   * @param previousMap - Previous node map
   * @param currentMap - Current node map
   * @returns Array of move operations with node ID
   */
  private detectMoves(
    previousMap: Map<string, CloudDOMNode>,
    currentMap: Map<string, CloudDOMNode>
  ): Array<{ nodeId: string; from: string; to: string }> {
    const moves: Array<{ nodeId: string; from: string; to: string }> = [];

    for (const [id, currentNode] of currentMap) {
      const previousNode = previousMap.get(id);

      if (previousNode) {
        // Get parent paths (all but last segment)
        const prevParentPathArray = previousNode.path.slice(0, -1);
        const currParentPathArray = currentNode.path.slice(0, -1);

        // Check if parent changed using array equality (not string comparison)
        // This handles dynamic segments correctly
        if (!deepEqual(prevParentPathArray, currParentPathArray, false)) {
          const prevParentPath = prevParentPathArray.join('.') || '<root>';
          const currParentPath = currParentPathArray.join('.') || '<root>';

          moves.push({
            nodeId: id,
            from: prevParentPath,
            to: currParentPath,
          });

          this.log(`Move detected: ${id} from ${prevParentPath} to ${currParentPath}`);
        }
      }
    }

    return moves;
  }

  /**
   * Detect the type of change between two nodes
   *
   * Returns:
   * - 'replacement': Construct type changed (needs delete + create)
   * - 'update': Props changed but construct is same (can update in place)
   * - 'none': No changes detected
   *
   * Performance optimization:
   * - Uses shallow prop hashes for O(1) comparison
   * - Only falls back to deep equality if hashes differ
   * - Caches hashes in node metadata (_propHash)
   *
   * @param previous - Previous node
   * @param current - Current node
   * @returns Change type
   */
  private detectChangeType(
    previous: CloudDOMNode,
    current: CloudDOMNode
  ): 'replacement' | 'update' | 'none' {
    // Check if construct type changed (needs replacement)
    if (!this.constructsEqual(previous.construct, current.construct)) {
      return 'replacement';
    }

    // Hash-based diff acceleration: compute or reuse cached hashes
    const prevHash = ((previous as any)._propHash ??= this.computeShallowHash(previous.props));
    const currHash = ((current as any)._propHash ??= this.computeShallowHash(current.props));

    // Fast path: if hashes match, props are identical (skip deep equality)
    if (prevHash === currHash) {
      // Even if props are the same, check if outputs changed
      if (this.outputsChanged(previous.outputs, current.outputs)) {
        return 'update';
      }
      return 'none';
    }

    // Hashes differ: perform deep equality check to confirm
    if (this.propsChanged(previous.props, current.props) || 
        this.outputsChanged(previous.outputs, current.outputs)) {
      return 'update';
    }

    return 'none';
  }

  /**
   * Check if two constructs are equal
   *
   * Constructs are considered equal if they have the same name.
   * Handles edge cases like minified builds where function names may be undefined.
   *
   * @param a - First construct
   * @param b - Second construct
   * @returns True if constructs are equal
   */
  private constructsEqual(a: ConstructLike, b: ConstructLike): boolean {
    // Handle null/undefined
    if (a === b) {
      return true;
    }

    if (!a || !b) {
      return false;
    }

    // Extract names for comparison
    const nameA = this.getConstructName(a);
    const nameB = this.getConstructName(b);

    return nameA === nameB;
  }

  /**
   * Get the name of a construct
   *
   * @param construct - Construct to get name from
   * @returns Construct name
   */
  private getConstructName(construct: ConstructLike): string {
    if (typeof construct === 'string') {
      return construct;
    }

    if (typeof construct === 'function') {
      return construct.name || construct.constructor?.name || 'anonymous';
    }

    if (construct && typeof construct === 'object' && 'name' in construct) {
      return String(construct.name);
    }

    return 'unknown';
  }

  /**
   * Check if node props have changed using deep equality
   *
   * Compares props objects deeply to detect any changes.
   * Uses the deepEqual utility with memoization for performance.
   *
   * Skips props that start with underscore (internal metadata).
   *
   * @param prevProps - Previous props (optional, defaults to empty object)
   * @param currProps - Current props (optional, defaults to empty object)
   * @returns True if props have changed
   */
  private propsChanged(
    prevProps: Record<string, any> = {},
    currProps: Record<string, any> = {}
  ): boolean {
    // Filter out internal metadata props using shared helper
    const filterMetadata = (props: Record<string, any>) => {
      const filtered: Record<string, any> = {};
      for (const [key, value] of Object.entries(props)) {
        if (!this.isMetadataKey(key)) {
          filtered[key] = value;
        }
      }
      return filtered;
    };

    const prevFiltered = filterMetadata(prevProps);
    const currFiltered = filterMetadata(currProps);

    // Use deep equality with memoization
    return !deepEqual(prevFiltered, currFiltered);
  }

  /**
   * Check if outputs have changed using deep equality
   *
   * @param previous - Previous outputs
   * @param current - Current outputs
   * @returns True if outputs changed
   */
  private outputsChanged(
    previous: Record<string, any> | undefined, 
    current: Record<string, any> | undefined
  ): boolean {
    // Handle undefined cases
    if (previous === undefined && current === undefined) {
      return false;
    }
    if (previous === undefined || current === undefined) {
      return true;
    }
    
    return !deepEqual(previous, current);
  }

  /**
   * Build dependency graph from CloudDOM nodes
   *
   * Scans node props for references to other node IDs and builds
   * an adjacency list representing dependencies.
   *
   * A node depends on another if its props reference the other node's ID.
   *
   * REQ-O01: Dependency graph for deployment ordering
   *
   * @param nodes - CloudDOM nodes
   * @returns DependencyGraph with adjacency lists
   */
  private buildDependencyGraph(nodes: CloudDOMNode[]): DependencyGraph {
    const dependencies = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();

    // Initialize empty dependency lists for all nodes
    for (const node of nodes) {
      dependencies.set(node.id, []);
      dependents.set(node.id, []);
    }

    // Build set of all node IDs for quick lookup
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Scan props for references to other node IDs
    for (const node of nodes) {
      const deps = this.extractDependencies(node, nodeIds);
      dependencies.set(node.id, deps);

      // Build reverse adjacency list (dependents)
      for (const depId of deps) {
        if (!dependents.has(depId)) {
          dependents.set(depId, []);
        }
        dependents.get(depId)!.push(node.id);
      }
    }

    // Validate graph integrity
    this.validateGraph({ dependencies, dependents });

    // Detect circular dependencies
    this.detectCircularDependencies(dependencies);

    return { dependencies, dependents };
  }

  /**
   * Validate dependency graph integrity
   *
   * Ensures all dependencies exist in the graph and no missing node IDs remain.
   *
   * @param graph - Dependency graph to validate
   * @throws ReconciliationError if graph is invalid
   */
  private validateGraph(graph: DependencyGraph): void {
    const { dependencies } = graph;

    for (const [nodeId, deps] of dependencies) {
      for (const depId of deps) {
        if (!dependencies.has(depId)) {
          const errorDetails = {
            nodeId,
            missingDependency: depId,
            availableNodes: Array.from(dependencies.keys()),
          };
          throw new ReconciliationError(
            `Missing dependency: ${nodeId} → ${depId}. Referenced node does not exist in graph.`,
            errorDetails
          );
        }
      }
    }
  }

  /**
   * Extract dependencies from a node's props
   *
   * Recursively scans props object for strings that match other node IDs.
   *
   * Optimizations:
   * - Skips props that start with underscore (internal metadata)
   * - Uses explicit ref convention when available (props.ref or props.dependsOn)
   * - Caches known non-ID props to avoid false positives
   *
   * @param node - CloudDOM node
   * @param nodeIds - Set of all node IDs for validation
   * @returns Array of dependency IDs
   */
  private extractDependencies(node: CloudDOMNode, nodeIds: Set<string>): string[] {
    const deps = new Set<string>();

    // Check for explicit dependency declarations first
    if (node.props.dependsOn) {
      const dependsOn = Array.isArray(node.props.dependsOn)
        ? node.props.dependsOn
        : [node.props.dependsOn];

      for (const depId of dependsOn) {
        if (typeof depId === 'string' && nodeIds.has(depId) && depId !== node.id) {
          deps.add(depId);
        }
      }
    }

    // Check for ref prop (common convention)
    if (node.props.ref && typeof node.props.ref === 'string') {
      if (nodeIds.has(node.props.ref) && node.props.ref !== node.id) {
        deps.add(node.props.ref);
      }
    }

    // Scan all props for implicit dependencies
    const scan = (value: any, key?: string) => {
      // Skip internal metadata props using shared helper
      if (key && this.isMetadataKey(key)) {
        return;
      }

      // Skip known non-ID props
      if (key && this.isKnownNonIdProp(key)) {
        return;
      }

      if (typeof value === 'string') {
        // Check if this string is a node ID
        if (nodeIds.has(value) && value !== node.id) {
          deps.add(value);
        }
      } else if (Array.isArray(value)) {
        value.forEach((v) => scan(v));
      } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) {
          scan(v, k);
        }
      }
    };

    // Scan all props
    for (const [key, value] of Object.entries(node.props)) {
      scan(value, key);
    }

    return Array.from(deps);
  }

  /**
   * Check if a prop key is known to never contain node IDs
   *
   * This helps avoid false positives in dependency extraction.
   *
   * @param key - Prop key
   * @returns True if this prop is known to not contain IDs
   */
  private isKnownNonIdProp(key: string): boolean {
    const knownNonIdProps = new Set([
      'name',
      'description',
      'version',
      'region',
      'zone',
      'namespace',
      'label',
      'tag',
      'tags',
      'metadata',
      'annotations',
      'key',
    ]);

    return knownNonIdProps.has(key);
  }

  /**
   * Detect circular dependencies using DFS
   *
   * Collects all cycles before throwing to provide comprehensive diagnostics.
   *
   * REQ-O01: Circular dependency detection
   *
   * @param dependencies - Dependency adjacency list
   * @throws ReconciliationError if circular dependencies are detected
   */
  private detectCircularDependencies(dependencies: Map<string, string[]>): void {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[] = []): void => {
      if (stack.has(nodeId)) {
        // Circular dependency detected - collect it
        const cycle = [...path, nodeId];
        cycles.push(cycle);
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      stack.add(nodeId);

      const deps = dependencies.get(nodeId) || [];
      for (const depId of deps) {
        try {
          dfs(depId, [...path, nodeId]);
        } catch {
          // Continue checking other dependencies
        }
      }

      stack.delete(nodeId);
    };

    // Run DFS from each node to find all cycles
    for (const nodeId of dependencies.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    // Throw if any cycles were found
    if (cycles.length > 0) {
      const cycleStrings = cycles.map((cycle) => cycle.join(' → '));
      throw new ReconciliationError(
        `Circular dependencies detected:\n  ${cycleStrings.join('\n  ')}`,
        {
          cycles,
          count: cycles.length,
        }
      );
    }
  }

  /**
   * Compute topological sort for deployment order using Kahn's algorithm
   *
   * Returns array of node IDs in deployment order (dependencies first).
   * Nodes with same depth are sorted by ID for determinism.
   *
   * REQ-O01: Topological sort for deployment order
   *
   * @param graph - Dependency graph
   * @returns Array of node IDs in deployment order
   */
  private topologicalSort(graph: DependencyGraph): string[] {
    const { dependencies, dependents } = graph;

    // Calculate in-degree for each node (number of dependencies)
    const inDegree = new Map<string, number>();
    for (const [nodeId, deps] of dependencies) {
      inDegree.set(nodeId, deps.length);
    }

    // Start with nodes that have no dependencies (in-degree = 0)
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Sort queue for determinism
    queue.sort();

    const result: string[] = [];

    while (queue.length > 0) {
      // Process nodes at same depth in sorted order for determinism
      const batchSize = queue.length;
      const batch: string[] = [];

      for (let i = 0; i < batchSize; i++) {
        const nodeId = queue.shift()!;
        batch.push(nodeId);

        // Reduce in-degree of dependents
        const deps = dependents.get(nodeId) || [];
        for (const depId of deps) {
          const degree = inDegree.get(depId)! - 1;
          inDegree.set(depId, degree);

          if (degree === 0) {
            queue.push(depId);
          }
        }
      }

      // Sort batch for determinism and add to result
      batch.sort();
      result.push(...batch);

      // Sort queue for next iteration
      queue.sort();
    }

    // Safety guard: ensure all nodes were sorted
    if (result.length !== dependencies.size) {
      throw new ReconciliationError(
        `Topological sort incomplete: ${result.length}/${dependencies.size} nodes sorted. Possible cycle or missing dependency.`,
        {
          sorted: result,
          expected: dependencies.size,
          missing: Array.from(dependencies.keys()).filter((id) => !result.includes(id)),
        }
      );
    }

    return result;
  }

  /**
   * Compute parallel deployment batches
   *
   * Groups nodes by depth in dependency graph.
   * Nodes at same depth can deploy in parallel (no dependencies between them).
   *
   * REQ-O01: Parallel deployment batches
   *
   * @param deploymentOrder - Topologically sorted node IDs
   * @param graph - Dependency graph
   * @returns Array of batches (each batch can deploy in parallel)
   */
  private computeParallelBatches(deploymentOrder: string[], graph: DependencyGraph): string[][] {
    const { dependencies } = graph;

    // Calculate depth for each node (max distance from a root node)
    const depths = new Map<string, number>();

    for (const nodeId of deploymentOrder) {
      const deps = dependencies.get(nodeId) || [];

      if (deps.length === 0) {
        // Root node (no dependencies)
        depths.set(nodeId, 0);
      } else {
        // Depth = max(dependency depths) + 1
        const maxDepth = Math.max(...deps.map((depId) => depths.get(depId) || 0));
        depths.set(nodeId, maxDepth + 1);
      }
    }

    // Group nodes by depth
    const batches = new Map<number, string[]>();
    for (const [nodeId, depth] of depths) {
      if (!batches.has(depth)) {
        batches.set(depth, []);
      }
      batches.get(depth)!.push(nodeId);
    }

    // Convert to array and sort each batch for determinism
    const result: string[][] = [];
    const sortedDepths = Array.from(batches.keys()).sort((a, b) => a - b);

    for (const depth of sortedDepths) {
      const batch = batches.get(depth)!;
      batch.sort(); // Sort for determinism
      result.push(batch);
    }

    return result;
  }
}
