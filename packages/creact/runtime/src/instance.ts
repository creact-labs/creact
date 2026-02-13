/**
 * useAsyncOutput - reactive instance management with handler-based setup/cleanup
 *
 * No hook memoization - instances are created once per component.
 */

import { createEffect } from "../../src/reactive/effect";
import {
  type Accessor,
  createSignal,
  type Setter,
} from "../../src/reactive/signal";
import { batch, untrack } from "../../src/reactive/tracking";
import {
  getCurrentFiber,
  getCurrentResourcePath,
  pushResourcePath,
} from "./render";

/**
 * Shallow equality check for output deduplication
 */
function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * SetOutputs function - like React's setState, accepts value or updater function
 */
export type SetOutputs<O> = (
  outputs: Partial<O> | ((prev: Partial<O> | undefined) => Partial<O>),
) => void;

/**
 * Handler function type - receives props and setOutputs, returns optional cleanup
 */
export type Handler<P, O> = (
  props: P,
  setOutputs: SetOutputs<O>,
) =>
  | (() => void | Promise<void>)
  | void
  | Promise<(() => void | Promise<void>) | void>;

/**
 * Instance node - represents a managed resource with setup/cleanup lifecycle
 */
export interface InstanceNode {
  id: string;
  path: string[];
  props: Record<string, any>;
  handler: Handler<any, any>;
  cleanupFn?: () => void | Promise<void>;
  outputSignals: Map<string, [Accessor<any>, Setter<any>]>;
  children: InstanceNode[];
  store?: any;
  outputs?: Record<string, any>;
  setOutputs(
    outputs:
      | Record<string, any>
      | ((prev: Record<string, any> | undefined) => Record<string, any>),
  ): void;
}

// Registry of all instance nodes by ID
const nodeRegistry = new Map<string, InstanceNode>();

// Track which fiber path owns each nodeId
const nodeOwnership = new Map<string, string>();

// Output hydration map
const outputHydrationMap = new Map<string, Record<string, any>>();

interface SerializedNodeForHydration {
  id: string;
  outputs?: Record<string, any>;
}

/**
 * Prepare output hydration from serialized nodes
 * @internal
 */
export function prepareOutputHydration(
  serializedNodes: SerializedNodeForHydration[],
): void {
  outputHydrationMap.clear();

  for (const node of serializedNodes) {
    if (node.outputs && Object.keys(node.outputs).length > 0) {
      outputHydrationMap.set(node.id, node.outputs);
    }
  }
}

/**
 * Clear output hydration map
 * @internal
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
 * Create an async output with handler-based lifecycle
 *
 * Called once per component (components run once). The instance is created
 * and registered, then the handler is executed by the runtime when changes
 * are applied.
 *
 * **Important: Handlers must be idempotent.**
 *
 * Handlers run on every application startup to re-establish side effects
 * (intervals, subscriptions, connections, etc.) that don't persist across
 * restarts. The runtime restores output values from state, but handlers
 * must re-create any runtime artifacts.
 *
 * The cleanup function (if returned) is called before re-running the handler
 * on updates or resume, allowing proper teardown of previous side effects.
 *
 * @param propsOrGetter - Input properties or a function that returns props (for reactive tracking)
 * @param handler - Setup function: (props, setOutputs) => cleanup
 * @returns Reactive output accessors
 *
 * @example
 * ```tsx
 * // Static props (no reactivity):
 * const bucket = useAsyncOutput({ name: "my-bucket" }, handler);
 *
 * // Reactive props (handler re-runs when dependencies change):
 * const file = useAsyncOutput(
 *   () => ({ bucket: bucketName(), hash: contentHash() }),
 *   async (props, setOutputs) => {
 *     await upload(props.bucket, props.hash);
 *     setOutputs({ status: 'uploaded' });
 *   }
 * );
 * ```
 */
export function useAsyncOutput<
  O extends Record<string, any> = Record<string, any>,
  P = Record<string, any>,
>(propsOrGetter: P | (() => P), handler: Handler<P, O>): OutputAccessors<O> {
  // Support both static props and getter function for reactive tracking
  const isGetter = typeof propsOrGetter === "function";
  const getProps = isGetter ? (propsOrGetter as () => P) : () => propsOrGetter;

  // Get initial props (untracked to avoid triggering during setup)
  const props = untrack(getProps);
  const fiber = getCurrentFiber();

  if (!fiber) {
    throw new Error("useAsyncOutput must be called during render");
  }

  // Enforce one instance per component
  if (fiber.instanceNodes.length > 0 || fiber.hasPlaceholderInstance) {
    throw new Error(
      "useAsyncOutput can only be called once per component. " +
        "Use child components for additional resources:\n\n" +
        "  function MyStack() {\n" +
        '    const db = useAsyncOutput({ name: "main" }, async (p, setOutputs) => {\n' +
        "      const conn = await connect(p.name);\n" +
        "      setOutputs({ url: conn.url });\n" +
        "      return () => conn.close();\n" +
        "    });\n" +
        "    return <Cache dbUrl={db.url()} />;\n" +
        "  }",
    );
  }

  // Generate deterministic ID using resource path + key
  const currentResourcePath = getCurrentResourcePath();
  const componentName =
    typeof fiber.type === "function"
      ? fiber.type.name || "Instance"
      : "Instance";
  const kebabName = toKebabCase(componentName);

  // Key is required for components using useAsyncOutput
  if (fiber.key === undefined) {
    throw new Error(
      `Component "${componentName}" uses useAsyncOutput but has no key.\n\n` +
        `Components with useAsyncOutput require a unique key for state persistence:\n\n` +
        `  <${componentName} key="unique-id" ... />\n\n` +
        `Or use keyFn in For loops:\n\n` +
        `  <For each={items} keyFn={(item) => item.id}>\n` +
        `    {(item) => <${componentName} ... />}\n` +
        `  </For>`,
    );
  }

  const name = `${kebabName}-${fiber.key}`;

  const fullPath = [...currentResourcePath, name];
  const nodeId = fullPath.join(".");

  // Check for undefined dependencies (excluding 'children' which JSX always passes even when undefined)
  const hasUndefinedDeps = Object.entries(props as Record<string, any>).some(
    ([key, value]) => key !== "children" && value === undefined,
  );
  const hasHydrationData = outputHydrationMap.has(nodeId);
  const hasExistingNode = nodeRegistry.has(nodeId);

  const isDeferred = hasUndefinedDeps && !hasHydrationData && !hasExistingNode;

  // Check for collisions (multiple instances with same resource path)
  const currentFiberPath = fiber.path.join(".");
  const existingOwnerPath = nodeOwnership.get(nodeId);
  if (existingOwnerPath && existingOwnerPath !== currentFiberPath) {
    throw new Error(
      `Duplicate resource ID "${nodeId}".\n\n` +
        `Multiple ${componentName} components share the same resource path.\n` +
        `Add a unique key to each instance:\n\n` +
        `  <${componentName} key="unique-id" ... />\n\n` +
        `Or use keyFn in For loops:\n\n` +
        `  <For each={items} keyFn={(item) => item.id}>\n` +
        `    {(item) => <${componentName} ... />}\n` +
        `  </For>`,
    );
  }
  nodeOwnership.set(nodeId, currentFiberPath);

  // Create or get existing node
  let node = nodeRegistry.get(nodeId);
  if (!node) {
    node = {
      id: nodeId,
      path: fullPath,
      props: props as Record<string, any>,
      handler,
      outputSignals: new Map(),
      children: [],
      setOutputs(
        outputsOrFn:
          | Record<string, any>
          | ((prev: Record<string, any> | undefined) => Record<string, any>),
      ) {
        // Support functional updates like React's setState
        const outputs =
          typeof outputsOrFn === "function"
            ? outputsOrFn(this.outputs)
            : outputsOrFn;

        let hasChanges = false;
        for (const [key, value] of Object.entries(outputs)) {
          if (!this.outputSignals.has(key)) {
            hasChanges = true;
            break;
          }
          const [read] = this.outputSignals.get(key)!;
          if (!shallowEqual(read(), value)) {
            hasChanges = true;
            break;
          }
        }

        if (!hasChanges) return;

        this.outputs = { ...(this.outputs || {}), ...outputs };

        nodeOwnership.clear();
        batch(() => {
          for (const [key, value] of Object.entries(outputs)) {
            if (!this.outputSignals.has(key)) {
              this.outputSignals.set(key, createSignal(value));
            } else {
              const [read, write] = this.outputSignals.get(key)!;
              if (!shallowEqual(read(), value)) {
                write(value);
              }
            }
          }
        });
      },
    };
    nodeRegistry.set(nodeId, node);
  } else {
    node.props = props as Record<string, any>;
    node.handler = handler;
  }

  pushResourcePath(name);

  // Hydrate outputs from previous run
  const hydratedOutputs = outputHydrationMap.get(nodeId);
  if (hydratedOutputs) {
    // Set node.outputs so setOutputs(prev => ...) can access previous values
    node.outputs = { ...hydratedOutputs };

    for (const [key, value] of Object.entries(hydratedOutputs)) {
      if (!node.outputSignals.has(key)) {
        node.outputSignals.set(key, createSignal(value));
      } else {
        const [read, write] = node.outputSignals.get(key)!;
        if (!shallowEqual(read(), value)) {
          write(value);
        }
      }
    }
  }

  if (isDeferred) {
    fiber.hasPlaceholderInstance = true;
  } else {
    fiber.instanceNodes.push(node);
  }

  // If props are reactive (getter function), track changes and update node.props.
  // Also handles deferred nodes: when undefined deps become defined, push to fiber.
  if (isGetter) {
    const ownerFiber = fiber;
    createEffect(() => {
      const newProps = getProps();
      node.props = newProps as Record<string, any>;

      // Upgrade deferred placeholder → real instance node when deps resolve
      if (
        ownerFiber.hasPlaceholderInstance &&
        !ownerFiber.instanceNodes.includes(node)
      ) {
        const stillUndefined = Object.entries(
          newProps as Record<string, any>,
        ).some(([key, value]) => key !== "children" && value === undefined);

        if (!stillUndefined) {
          ownerFiber.hasPlaceholderInstance = false;
          ownerFiber.instanceNodes.push(node);
        }
      }
    });
  }

  // Return proxy for output accessors
  return new Proxy({} as OutputAccessors<O>, {
    get(_, key: string) {
      if (!node.outputSignals.has(key)) {
        node.outputSignals.set(key, createSignal<any>());
      }
      const [read] = node.outputSignals.get(key)!;

      return () => {
        const value = read();
        if (typeof value === "function") {
          return value();
        }
        return value;
      };
    },
  });
}

/**
 * Convert PascalCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
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
 * Call all cleanup functions on registered nodes (best-effort, sync)
 * @internal
 */
export function callAllCleanupFunctions(): void {
  for (const node of nodeRegistry.values()) {
    if (node.cleanupFn) {
      const fn = node.cleanupFn;
      node.cleanupFn = undefined;
      try {
        fn();
      } catch {
        // best-effort
      }
    }
  }
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
