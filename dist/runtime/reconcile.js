/**
 * Reconciler - diff two sets of instance nodes with dependency ordering
 *
 * Key features:
 * - Path-based id for matching (unique per position in tree)
 * - Dependency graph from parent-child relationships
 * - Topological sort for correct deployment order
 * - Parallel batches for concurrent deployment
 */
/**
 * Build dependency graph from nodes
 *
 * Dependencies are derived from the path hierarchy:
 * - Parent must be deployed before children
 * - Node with path ['App', 'DB', 'Cache'] depends on ['App', 'DB']
 */
export function buildDependencyGraph(nodes) {
    const dependencies = new Map();
    const dependents = new Map();
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
                const parentId = parentPath.join('.');
                if (nodeIds.has(parentId)) {
                    // Add dependency: node depends on parent
                    dependencies.get(node.id).push(parentId);
                    // Add dependent: parent has node as dependent
                    dependents.get(parentId).push(node.id);
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
export function topologicalSort(nodeIds, graph) {
    const result = [];
    const inDegree = new Map();
    const queue = [];
    // Initialize in-degree counts
    for (const id of nodeIds) {
        const deps = graph.dependencies.get(id) ?? [];
        // Only count dependencies that are in our nodeIds set
        const relevantDeps = deps.filter((d) => nodeIds.includes(d));
        inDegree.set(id, relevantDeps.length);
        if (relevantDeps.length === 0) {
            queue.push(id);
        }
    }
    // Process nodes with no remaining dependencies
    while (queue.length > 0) {
        const current = queue.shift();
        result.push(current);
        // Reduce in-degree for dependents
        const deps = graph.dependents.get(current) ?? [];
        for (const dep of deps) {
            if (!inDegree.has(dep))
                continue; // Not in our set
            const newDegree = inDegree.get(dep) - 1;
            inDegree.set(dep, newDegree);
            if (newDegree === 0) {
                queue.push(dep);
            }
        }
    }
    // Check for cycles (but not for duplicate IDs, which are handled normally)
    if (result.length !== nodeIds.length) {
        const remaining = nodeIds.filter((id) => !result.includes(id));
        // Only warn if there are actual stuck nodes (not just duplicates)
        if (remaining.length > 0) {
            console.warn('Circular dependency detected. Remaining nodes:', remaining);
            // Still include remaining nodes at the end
            result.push(...remaining);
        }
    }
    return result;
}
/**
 * Compute parallel batches from deployment order
 *
 * Nodes that don't depend on each other can be deployed in parallel.
 * Each batch contains nodes that can be deployed concurrently.
 */
export function computeParallelBatches(deploymentOrder, graph) {
    const batches = [];
    const deployed = new Set();
    for (const nodeId of deploymentOrder) {
        // Find which batch this node can go in
        const deps = graph.dependencies.get(nodeId) ?? [];
        const relevantDeps = deps.filter((d) => deploymentOrder.includes(d));
        // Find the latest batch that contains a dependency
        let batchIndex = 0;
        for (let i = 0; i < batches.length; i++) {
            if (batches[i].some((id) => relevantDeps.includes(id))) {
                batchIndex = i + 1;
            }
        }
        // Create new batch if needed
        while (batches.length <= batchIndex) {
            batches.push([]);
        }
        batches[batchIndex].push(nodeId);
        deployed.add(nodeId);
    }
    return batches;
}
/**
 * Reconcile previous and current instance nodes
 * Uses path-based id for matching - each node has unique position in tree
 */
export function reconcile(previous, current) {
    // Use path-based id for matching (unique per position in tree)
    const prevMap = new Map(previous.map((n) => [n.id, n]));
    const currMap = new Map(current.map((n) => [n.id, n]));
    const creates = [];
    const updates = [];
    const deletes = [];
    // Find creates and updates
    for (const node of current) {
        const prev = prevMap.get(node.id);
        if (!prev) {
            creates.push(node);
        }
        else if (!deepEqual(prev.props, node.props)) {
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
export function deepEqual(a, b) {
    if (a === b)
        return true;
    if (a == null || b == null)
        return false;
    if (typeof a !== typeof b)
        return false;
    if (typeof a === 'object') {
        if (Array.isArray(a) !== Array.isArray(b))
            return false;
        if (Array.isArray(a)) {
            if (a.length !== b.length)
                return false;
            for (let i = 0; i < a.length; i++) {
                if (!deepEqual(a[i], b[i]))
                    return false;
            }
            return true;
        }
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length)
            return false;
        for (const key of keysA) {
            if (!Object.prototype.hasOwnProperty.call(b, key))
                return false;
            if (!deepEqual(a[key], b[key]))
                return false;
        }
        return true;
    }
    return false;
}
/**
 * Check if there are new nodes that weren't in previous
 * Uses id for matching consistency with reconcile()
 */
export function hasNewNodes(previous, current) {
    const prevIds = new Set(previous.map((n) => n.id));
    return current.some((n) => !prevIds.has(n.id));
}
