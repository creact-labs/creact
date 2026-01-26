/**
 * useInstance - bind to a provider and get reactive outputs
 */

import { createSignal, type Accessor, type Setter } from '../reactive/signal.js';
import { batch } from '../reactive/tracking.js';
import { getCurrentFiber, getCurrentPath } from '../runtime/render.js';

/**
 * Instance node - represents something materialized by provider
 */
export interface InstanceNode {
  id: string;
  path: string[];
  construct: any;
  constructType: string;
  props: Record<string, any>;
  outputSignals: Map<string, [Accessor<any>, Setter<any>]>;
  children: InstanceNode[];
  store?: any;
  /** Stable key for reconciliation, based on construct type + instance name */
  reconcileKey: string;
}

// Registry of all instance nodes by ID
const nodeRegistry = new Map<string, InstanceNode>();

/**
 * Output accessor type - each property is a signal accessor
 */
export type OutputAccessors<O> = {
  [K in keyof O]: () => O[K] | undefined;
};

/**
 * Create an instance bound to a provider
 */
export function useInstance<O extends Record<string, any> = Record<string, any>>(
  construct: any,
  props: Record<string, any>
): OutputAccessors<O> {
  const fiber = getCurrentFiber();
  const currentPath = getCurrentPath();

  if (!fiber) {
    throw new Error('useInstance must be called during render');
  }

  // Check for undefined dependencies - return placeholder
  const hasUndefinedDeps = Object.values(props).some((v) => v === undefined);
  if (hasUndefinedDeps) {
    return createPlaceholderProxy<O>();
  }

  // Generate deterministic ID
  const name = getNodeName(construct, props);
  const fullPath = [...currentPath, name];
  const nodeId = fullPath.join('.');

  // Clean props (remove undefined values)
  const cleanedProps: Record<string, any> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined) {
      cleanedProps[k] = v;
    }
  }

  // Generate reconcile key (stable across different component trees)
  const constructType = construct.name || 'Unknown';
  const instanceName = props.name ?? props.key ?? 'default';
  const reconcileKey = `${constructType}:${instanceName}`;

  // Create or get existing node
  let node = nodeRegistry.get(nodeId);
  if (!node) {
    node = {
      id: nodeId,
      path: fullPath,
      construct,
      constructType,
      props: cleanedProps,
      outputSignals: new Map(),
      children: [],
      reconcileKey,
    };
    nodeRegistry.set(nodeId, node);
  } else {
    // Update props
    node.props = cleanedProps;
  }

  // Attach to fiber
  fiber.instanceNodes.push(node);

  // Return proxy where each property access returns a signal accessor
  return new Proxy({} as OutputAccessors<O>, {
    get(_, key: string) {
      // Lazily create signal for this output
      if (!node!.outputSignals.has(key)) {
        node!.outputSignals.set(key, createSignal<any>());
      }
      const [read] = node!.outputSignals.get(key)!;
      return read;
    },
  });
}

/**
 * Create a placeholder proxy for when dependencies are undefined
 */
function createPlaceholderProxy<O>(): OutputAccessors<O> {
  return new Proxy({} as OutputAccessors<O>, {
    get() {
      return () => undefined;
    },
  });
}

/**
 * Generate a node name from construct and props
 */
function getNodeName(construct: any, props: Record<string, any>): string {
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
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Fill instance outputs (called by runtime after provider returns)
 * @internal
 */
export function fillInstanceOutputs(nodeId: string, outputs: Record<string, any>): void {
  const node = nodeRegistry.get(nodeId);
  if (!node) return;

  batch(() => {
    for (const [key, value] of Object.entries(outputs)) {
      if (node.outputSignals.has(key)) {
        const [, write] = node.outputSignals.get(key)!;
        write(value);
      } else {
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
export function getNodeById(nodeId: string): InstanceNode | undefined {
  return nodeRegistry.get(nodeId);
}

/**
 * Get all registered nodes
 * @internal
 */
export function getAllNodes(): InstanceNode[] {
  return Array.from(nodeRegistry.values());
}

/**
 * Clear node registry (for testing)
 * @internal
 */
export function clearNodeRegistry(): void {
  nodeRegistry.clear();
}
