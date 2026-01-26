/**
 * Store - persistent state (non-reactive)
 */
import { getCurrentFiber } from '../runtime/render.js';
// Hydration map for restoring state across cycles
let hydrationMap = new Map();
/**
 * Create a persistent store (non-reactive)
 */
export function createStore(initial) {
    const fiber = getCurrentFiber();
    // Try to hydrate from previous cycle
    const hydrated = fiber ? hydrateStore(fiber.path) : undefined;
    const state = hydrated ?? { ...initial };
    // Mark for persistence
    if (fiber) {
        fiber.store = state;
    }
    function setStore(...args) {
        updatePath(state, args);
    }
    return [state, setStore];
}
/**
 * Update a nested path in an object
 */
function updatePath(obj, args) {
    if (args.length === 2) {
        const [key, value] = args;
        obj[key] = typeof value === 'function' ? value(obj[key]) : value;
    }
    else if (args.length > 2) {
        const key = args[0];
        if (obj[key] === undefined) {
            obj[key] = {};
        }
        updatePath(obj[key], args.slice(1));
    }
}
/**
 * Prepare hydration from previous nodes
 * @internal
 */
export function prepareHydration(previousNodes) {
    hydrationMap.clear();
    for (const node of flattenNodes(previousNodes)) {
        if (node.store) {
            // Key by component path (parent of node)
            const componentPath = node.path.slice(0, -1).join('.');
            hydrationMap.set(componentPath, node.store);
        }
    }
}
/**
 * Hydrate store from previous cycle
 */
function hydrateStore(fiberPath) {
    if (!fiberPath)
        return undefined;
    const key = fiberPath.join('.');
    return hydrationMap.get(key);
}
/**
 * Flatten nested nodes
 */
function flattenNodes(nodes) {
    const result = [];
    function walk(node) {
        result.push(node);
        if (node.children) {
            for (const child of node.children) {
                walk(child);
            }
        }
    }
    for (const node of nodes) {
        walk(node);
    }
    return result;
}
/**
 * Clear hydration map (for testing)
 * @internal
 */
export function clearHydration() {
    hydrationMap.clear();
}
