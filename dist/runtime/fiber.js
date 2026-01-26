/**
 * Fiber - intermediate representation of component tree
 */
/**
 * Create a new fiber
 */
export function createFiber(type, props, path, key) {
    return {
        type,
        props,
        children: [],
        path,
        key,
        instanceNodes: [],
    };
}
