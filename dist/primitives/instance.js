/**
 * useInstance - bind to a provider and get reactive outputs
 */
import { createSignal } from '../reactive/signal.js';
import { batch } from '../reactive/tracking.js';
import { getCurrentFiber, getCurrentPath } from '../runtime/render.js';
// Registry of all instance nodes by ID
const nodeRegistry = new Map();
/**
 * Create an instance bound to a provider
 */
export function useInstance(construct, props) {
    const fiber = getCurrentFiber();
    const currentPath = getCurrentPath();
    if (!fiber) {
        throw new Error('useInstance must be called during render');
    }
    // Check for undefined dependencies - return placeholder
    const hasUndefinedDeps = Object.values(props).some((v) => v === undefined);
    if (hasUndefinedDeps) {
        return createPlaceholderProxy();
    }
    // Generate deterministic ID
    const name = getNodeName(construct, props);
    const fullPath = [...currentPath, name];
    const nodeId = fullPath.join('.');
    // Clean props (remove undefined values)
    const cleanedProps = {};
    for (const [k, v] of Object.entries(props)) {
        if (v !== undefined) {
            cleanedProps[k] = v;
        }
    }
    // Create or get existing node
    let node = nodeRegistry.get(nodeId);
    if (!node) {
        node = {
            id: nodeId,
            path: fullPath,
            construct,
            constructType: construct.name || 'Unknown',
            props: cleanedProps,
            outputSignals: new Map(),
            children: [],
        };
        nodeRegistry.set(nodeId, node);
    }
    else {
        // Update props
        node.props = cleanedProps;
    }
    // Attach to fiber
    fiber.instanceNode = node;
    // Return proxy where each property access returns a signal accessor
    return new Proxy({}, {
        get(_, key) {
            // Lazily create signal for this output
            if (!node.outputSignals.has(key)) {
                node.outputSignals.set(key, createSignal());
            }
            const [read] = node.outputSignals.get(key);
            return read;
        },
    });
}
/**
 * Create a placeholder proxy for when dependencies are undefined
 */
function createPlaceholderProxy() {
    return new Proxy({}, {
        get() {
            return () => undefined;
        },
    });
}
/**
 * Generate a node name from construct and props
 */
function getNodeName(construct, props) {
    const baseName = construct.name || 'Instance';
    const kebab = toKebabCase(baseName);
    // Use name prop if available, otherwise key
    if (props.name) {
        return `${kebab}-${props.name}`;
    }
    if (props.key !== undefined) {
        return `${kebab}-${props.key}`;
    }
    return kebab;
}
/**
 * Convert PascalCase to kebab-case
 */
function toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
/**
 * Fill instance outputs (called by runtime after provider returns)
 * @internal
 */
export function fillInstanceOutputs(nodeId, outputs) {
    const node = nodeRegistry.get(nodeId);
    if (!node)
        return;
    batch(() => {
        for (const [key, value] of Object.entries(outputs)) {
            if (node.outputSignals.has(key)) {
                const [, write] = node.outputSignals.get(key);
                write(value);
            }
            else {
                // Create signal with initial value
                node.outputSignals.set(key, createSignal(value));
            }
        }
    });
}
/**
 * Get a node by ID
 * @internal
 */
export function getNodeById(nodeId) {
    return nodeRegistry.get(nodeId);
}
/**
 * Get all registered nodes
 * @internal
 */
export function getAllNodes() {
    return Array.from(nodeRegistry.values());
}
/**
 * Clear node registry (for testing)
 * @internal
 */
export function clearNodeRegistry() {
    nodeRegistry.clear();
}
