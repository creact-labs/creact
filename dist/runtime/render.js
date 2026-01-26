/**
 * Render - transform JSX to Fiber tree
 */
import { createFiber } from './fiber.js';
import { runComputation, cleanComputation } from '../reactive/tracking.js';
import { pushContext, popContext } from '../primitives/context.js';
// Current render context
let currentFiber = null;
let currentPath = [];
/**
 * Get current fiber (for hooks)
 */
export function getCurrentFiber() {
    return currentFiber;
}
/**
 * Get current path (for hooks)
 */
export function getCurrentPath() {
    return [...currentPath];
}
/**
 * Render a JSX element to a Fiber
 */
export function renderFiber(element, path) {
    // Handle null/undefined/boolean
    if (element == null || typeof element === 'boolean') {
        return createFiber(null, {}, path);
    }
    // Handle primitives (text)
    if (typeof element === 'string' || typeof element === 'number') {
        return createFiber('text', { value: element }, path);
    }
    // Handle arrays
    if (Array.isArray(element)) {
        const fiber = createFiber('fragment', {}, path);
        fiber.children = element.map((child, i) => {
            const childKey = child?.key ?? i;
            return renderFiber(child, [...path, String(childKey)]);
        });
        return fiber;
    }
    // Handle JSX element
    const { type, props = {}, key } = element;
    const { children, ...restProps } = props;
    // Generate path segment
    const name = getNodeName(type, props, key);
    const fiberPath = [...path, name];
    const fiber = createFiber(type, restProps, fiberPath, key);
    // Check if this is a context provider
    if (element.__isProvider && element.__context) {
        pushContext(element.__context, props.value);
        try {
            fiber.children = renderChildren(children, fiberPath);
        }
        finally {
            popContext(element.__context);
        }
        return fiber;
    }
    // Handle function components
    if (typeof type === 'function') {
        // Create computation for this component
        const computation = {
            fn: () => executeComponent(fiber, type, { ...restProps, children }),
            sources: null,
            sourceSlots: null,
            state: 1, // STALE
            cleanups: null,
        };
        fiber.computation = computation;
        // Initial render
        runComputation(computation);
    }
    else {
        // Intrinsic element - just render children
        fiber.children = renderChildren(children, fiberPath);
    }
    return fiber;
}
/**
 * Execute a component function
 */
function executeComponent(fiber, type, props) {
    const prevFiber = currentFiber;
    const prevPath = currentPath;
    currentFiber = fiber;
    currentPath = fiber.path;
    // Clear instance nodes before re-executing component
    fiber.instanceNodes = [];
    try {
        // Execute component
        const result = type(props);
        // Render children from result
        fiber.children = renderChildren(result, fiber.path);
    }
    finally {
        currentFiber = prevFiber;
        currentPath = prevPath;
    }
}
/**
 * Render children (handles various child types)
 */
function renderChildren(children, parentPath) {
    if (children == null || typeof children === 'boolean') {
        return [];
    }
    if (Array.isArray(children)) {
        return children.flatMap((child, i) => {
            const childKey = child?.key ?? i;
            const fiber = renderFiber(child, [...parentPath, String(childKey)]);
            return fiber.type === null ? [] : [fiber];
        });
    }
    const fiber = renderFiber(children, parentPath);
    return fiber.type === null ? [] : [fiber];
}
/**
 * Get node name from type and props
 */
function getNodeName(type, props, key) {
    if (key !== undefined) {
        return String(key);
    }
    if (typeof type === 'string') {
        return type;
    }
    if (typeof type === 'function') {
        return type.name || 'Component';
    }
    return 'unknown';
}
/**
 * Collect all instance nodes from fiber tree
 * Returns cloned nodes to ensure returned arrays are independent snapshots
 */
export function collectInstanceNodes(fiber) {
    const nodes = [];
    function walk(f) {
        for (const instanceNode of f.instanceNodes) {
            // Clone the node to create an independent snapshot
            // (outputSignals are not cloned - they're internal reactive state)
            const snapshot = {
                ...instanceNode,
                // Deep clone the store so it's independent between runs
                store: f.store ? JSON.parse(JSON.stringify(f.store)) : undefined,
            };
            nodes.push(snapshot);
        }
        for (const child of f.children) {
            walk(child);
        }
    }
    walk(fiber);
    return nodes;
}
/**
 * Clean up a fiber tree
 */
export function cleanupFiber(fiber) {
    if (fiber.computation) {
        cleanComputation(fiber.computation);
    }
    for (const child of fiber.children) {
        cleanupFiber(child);
    }
}
