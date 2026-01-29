/**
 * useInstance - bind to a provider and get reactive outputs
 */

import { createSignal, type Accessor, type Setter } from '../reactive/signal.js';
import { batch } from '../reactive/tracking.js';
import { getCurrentFiber, getCurrentResourcePath, pushResourcePath } from '../runtime/render.js';

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
  outputs?: Record<string, any>;  // Legacy: Provider sets this during materialize
  /** Update outputs reactively - triggers dependent re-renders via signals */
  setOutputs(outputs: Record<string, any>): void;
}

// Registry of all instance nodes by ID
const nodeRegistry = new Map<string, InstanceNode>();

// Track which fiber owns each nodeId (to detect duplicate siblings)
const nodeOwnership = new Map<string, any>();

// Output hydration map - populated before render to restore outputs from previous run
let outputHydrationMap = new Map<string, Record<string, any>>();

/**
 * Serialized node shape (from backend.ts) - only what we need for hydration
 */
interface SerializedNodeForHydration {
  id: string;
  outputs?: Record<string, any>;
}

/**
 * Prepare output hydration from serialized nodes
 * Called by runtime BEFORE rendering to restore outputs
 */
export function prepareOutputHydration(serializedNodes: SerializedNodeForHydration[]): void {
  outputHydrationMap.clear();

  for (const node of serializedNodes) {
    if (node.outputs && Object.keys(node.outputs).length > 0) {
      outputHydrationMap.set(node.id, node.outputs);
    }
  }
}

/**
 * Clear output hydration map
 */
export function clearOutputHydration(): void {
  outputHydrationMap.clear();
}

/**
 * Output accessor type - each property is a signal accessor
 */
export type OutputAccessors<O> = {
  [K in keyof O]: () => O[K] | undefined;
};

/**
 * Create a placeholder proxy that returns undefined for all outputs
 * Used when props have undefined dependencies - node won't be created yet
 */
function createPlaceholderProxy<O>(): OutputAccessors<O> {
  return new Proxy({} as OutputAccessors<O>, {
    get(_, key: string) {
      return () => undefined;  // All outputs return undefined
    },
  });
}

/**
 * Create an instance bound to a provider
 */
export function useInstance<O extends Record<string, any> = Record<string, any>>(
  construct: any,
  props: Record<string, any>
): OutputAccessors<O> {
  const fiber = getCurrentFiber();

  if (!fiber) {
    throw new Error('useInstance must be called during render');
  }

  // Enforce one instance per component - forces proper JSX composition
  // Each component = one resource, compose via children
  if (fiber.instanceNodes.length > 0 || fiber.hasPlaceholderInstance) {
    throw new Error(
      'useInstance can only be called once per component. ' +
      'Use child components for additional resources:\n\n' +
      '  function MyStack() {\n' +
      '    const db = useInstance(Database, { name: "main" });\n' +
      '    return <Cache dbUrl={db.url()} />;\n' +
      '  }\n\n' +
      '  function Cache({ dbUrl }) {\n' +
      '    useInstance(CacheService, { db: dbUrl });\n' +
      '    return null;\n' +
      '  }'
    );
  }

  // Generate deterministic ID using resource path (not fiber path)
  // This makes wrapper components transparent - they don't affect resource IDs
  const currentResourcePath = getCurrentResourcePath();
  const name = getNodeName(construct, fiber.key);
  const fullPath = [...currentResourcePath, name];
  const nodeId = fullPath.join('.');

  // Check for undefined dependencies BEFORE creating/updating node
  // If any prop is undefined, return placeholder - don't create node in registry
  const hasUndefinedDeps = Object.values(props).some((v) => v === undefined);

  if (hasUndefinedDeps) {
    // STILL push to resource path so children have correct paths
    pushResourcePath(name);

    // Mark fiber as having a placeholder instance (for proper path pop in render.ts)
    fiber.hasPlaceholderInstance = true;

    return createPlaceholderProxy<O>();
  }

  const constructType = construct.name || 'Unknown';

  // Check for duplicate siblings (requires keys)
  // Allow same fiber to re-register (reactive re-render), but not different fibers
  const existingOwner = nodeOwnership.get(nodeId);
  if (existingOwner && existingOwner !== fiber) {
    throw new Error(
      `Multiple instances of ${constructType} at the same level require unique keys.\n` +
      `Add a key prop to differentiate them:\n\n` +
      `  {items.map((item) => (\n` +
      `    <MyResource key={item.id} ... />\n` +
      `  ))}`
    );
  }
  nodeOwnership.set(nodeId, fiber);

  // Create or get existing node
  let node = nodeRegistry.get(nodeId);
  if (!node) {
    node = {
      id: nodeId,
      path: fullPath,
      construct,
      constructType,
      props,
      outputSignals: new Map(),
      children: [],
      setOutputs(outputs: Record<string, any>) {
        // Clear ownership before batch triggers re-renders
        // When signals update, components re-execute and create new fibers
        // that need to claim the same nodeIds
        nodeOwnership.clear();

        batch(() => {
          for (const [key, value] of Object.entries(outputs)) {
            if (!this.outputSignals.has(key)) {
              this.outputSignals.set(key, createSignal(value));
            } else {
              const [, write] = this.outputSignals.get(key)!;
              write(value);
            }
          }
        });
      },
    };
    nodeRegistry.set(nodeId, node);
  } else {
    // Update props
    node.props = props;
  }

  // Push to resource path so children see this component in their path
  pushResourcePath(name);

  // Hydrate outputs from previous run (if available)
  const hydratedOutputs = outputHydrationMap.get(nodeId);
  if (hydratedOutputs) {
    for (const [key, value] of Object.entries(hydratedOutputs)) {
      if (!node.outputSignals.has(key)) {
        node.outputSignals.set(key, createSignal(value));
      } else {
        const [, write] = node.outputSignals.get(key)!;
        write(value);
      }
    }
  }

  // Attach to fiber
  fiber.instanceNodes.push(node);

  // Return proxy where each property access returns a wrapper function
  // that auto-unwraps accessors (SolidJS-style)
  return new Proxy({} as OutputAccessors<O>, {
    get(_, key: string) {
      // Lazily create signal for this output
      if (!node!.outputSignals.has(key)) {
        node!.outputSignals.set(key, createSignal<any>());
      }
      const [read] = node!.outputSignals.get(key)!;

      // Return wrapper that auto-unwraps accessors
      return () => {
        const value = read();  // Read from signal (tracks it)
        // If provider returned an accessor, call it (tracks provider's signal)
        if (typeof value === 'function') {
          return value();
        }
        return value;
      };
    },
  });
}

/**
 * Generate a node name from construct and fiber key
 */
function getNodeName(construct: any, key?: string | number): string {
  const baseName = construct.name || 'Instance';
  const kebab = toKebabCase(baseName);

  if (key !== undefined) {
    return `${kebab}-${key}`;
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

  // Clear ownership before batch triggers re-renders
  // When signals update, components re-execute and create new fibers
  // that need to claim the same nodeIds
  nodeOwnership.clear();

  batch(() => {
    for (const [key, value] of Object.entries(outputs)) {
      if (node.outputSignals.has(key)) {
        const [, write] = node.outputSignals.get(key)!;
        write(value);  // Write value (plain or accessor) to signal
      } else {
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
  nodeOwnership.clear();
}

/**
 * Clear node ownership (call at start of each render pass)
 * @internal
 */
export function clearNodeOwnership(): void {
  nodeOwnership.clear();
}
