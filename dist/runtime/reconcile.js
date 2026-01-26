/**
 * Reconciler - diff two sets of instance nodes
 */
/**
 * Reconcile previous and current instance nodes
 */
export function reconcile(previous, current) {
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
    return { creates, updates, deletes };
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
 */
export function hasNewNodes(previous, current) {
    const prevIds = new Set(previous.map((n) => n.id));
    return current.some((n) => !prevIds.has(n.id));
}
