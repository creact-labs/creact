/**
 * useAsyncOutput - reactive instance management with handler-based setup/cleanup
 *
 * No hook memoization - instances are created once per component.
 */

import { createEffect } from "../reactive/effect";
import {
  type Accessor,
  createSignal,
  type Setter,
} from "../reactive/signal";
import { batch, untrack } from "../reactive/tracking";
import type { Fiber } from "./fiber";
import { plainObjectsEqualWith } from "./plain-objects-equal";
import {
  getCurrentFiber,
  getCurrentResourcePath,
  pushResourcePath,
} from "./render";
import {
  allContexts,
  getActiveContext,
  type RuntimeContext,
} from "./runtime-context";

/**
 * Shallow equality check for output deduplication
 * @internal exported for tests
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;

  if (Array.isArray(a)) return arraysShallowEqual(a, b);
  if (a instanceof Map) return mapsShallowEqual(a, b);
  if (a instanceof Set) return setsShallowEqual(a, b);
  return plainObjectsShallowEqual(
    a as Record<string, unknown>,
    b as Record<string, unknown>,
  );
}

/** Array: compare length + elements by identity */
function arraysShallowEqual(a: unknown[], b: unknown): boolean {
  if (!Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** Map: compare size + entries by identity */
function mapsShallowEqual(a: Map<unknown, unknown>, b: unknown): boolean {
  if (!(b instanceof Map) || a.size !== b.size) return false;
  for (const [key, val] of a) {
    if (!b.has(key) || b.get(key) !== val) return false;
  }
  return true;
}

/** Set: compare size + membership */
function setsShallowEqual(a: Set<unknown>, b: unknown): boolean {
  if (!(b instanceof Set) || a.size !== b.size) return false;
  for (const val of a) {
    if (!b.has(val)) return false;
  }
  return true;
}

/** Plain object: compare key sets + values by identity */
function plainObjectsShallowEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  return plainObjectsEqualWith(a, b, (aValue, bValue) => aValue === bValue);
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
  // Props/outputs carry arbitrary user data. Values stay `any` so callers
  // can read fields without casting, and so interface-typed user objects
  // remain assignable (Record<string, unknown> rejects interfaces without
  // index signatures). Handler<any, any> is a variance escape: the registry
  // holds handlers whose P/O types are unrelated, and Handler is invariant.
  props: Record<string, any>;
  handler: Handler<any, any>;
  cleanupFn?: () => void | Promise<void>;
  outputSignals: Map<string, [Accessor<unknown>, Setter<unknown>]>;
  children: InstanceNode[];
  store?: object;
  outputs?: Record<string, any>;
  setOutputs(
    outputs:
      | Record<string, any>
      | ((prev: Record<string, any> | undefined) => Record<string, any>),
  ): void;
}

// The node registry, ownership map, and output hydration map live on each
// RuntimeContext — helpers below default to the active context but accept
// an explicit one (the runtime passes its own).

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
  ctx: RuntimeContext = getActiveContext(),
): void {
  ctx.outputHydration.clear();

  for (const node of serializedNodes) {
    if (node.outputs && Object.keys(node.outputs).length > 0) {
      ctx.outputHydration.set(node.id, node.outputs);
    }
  }
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
  const props = untrack(getProps) as Record<string, any>;
  const fiber = getCurrentFiber();

  if (!fiber) {
    throw new Error("useAsyncOutput must be called during render");
  }
  // The owning runtime is resolved through the fiber, never module globals
  const ctx = fiber.ctx;
  assertSingleInstancePerComponent(fiber);

  // Only function components execute code, so fiber.type is always a function
  const componentType = fiber.type as (props: unknown) => unknown;
  const componentName = componentType.name || "Instance";
  requireKey(fiber, componentName);

  // Generate deterministic ID using resource path + key
  const { name, fullPath, nodeId } = deriveInstanceAddress(fiber);

  // A resource with undefined deps and no prior state waits for its deps
  const isDeferred =
    hasUndefinedValues(props) &&
    !ctx.outputHydration.has(nodeId) &&
    !ctx.nodeRegistry.has(nodeId);

  claimOwnership(ctx, nodeId, fiber, componentName);

  // Create or get existing node
  let node = ctx.nodeRegistry.get(nodeId);
  if (!node) {
    node = createInstanceNode(nodeId, fullPath, props, handler);
    ctx.nodeRegistry.set(nodeId, node);
  } else {
    node.props = props;
    node.handler = handler;
  }

  pushResourcePath(name);
  hydrateNodeOutputs(ctx, node, nodeId);

  if (isDeferred) {
    fiber.hasPlaceholderInstance = true;
  } else {
    fiber.instanceNodes.push(node);
  }

  if (isGetter) {
    trackReactiveProps(fiber, node, getProps);
  }

  return createOutputProxy<O>(node);
}

/**
 * The one identity scheme at every level: a component's node address is the
 * current resource path plus `<kebab-name>-<key>`. Shared by useAsyncOutput
 * (node ids) and createRuntime (child stack names).
 * @internal
 */
export function deriveInstanceAddress(fiber: Fiber): {
  name: string;
  fullPath: string[];
  nodeId: string;
} {
  const componentType = fiber.type as (props: unknown) => unknown;
  const componentName = componentType.name || "Instance";
  const name = `${toKebabCase(componentName)}-${fiber.key}`;
  const fullPath = [...getCurrentResourcePath(), name];
  return { name, fullPath, nodeId: fullPath.join(".") };
}

/** Enforce one useAsyncOutput per component */
function assertSingleInstancePerComponent(fiber: NonNullable<
  ReturnType<typeof getCurrentFiber>
>): void {
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
}

/** Shared "add a key" hint for identity errors */
function keyHint(componentName: string): string {
  return (
    `  <${componentName} key="unique-id" ... />\n\n` +
    `Or use keyFn in For loops:\n\n` +
    `  <For each={items} keyFn={(item) => item.id}>\n` +
    `    {(item) => <${componentName} ... />}\n` +
    `  </For>`
  );
}

/** Key is required for components using useAsyncOutput */
function requireKey(
  fiber: NonNullable<ReturnType<typeof getCurrentFiber>>,
  componentName: string,
): void {
  if (fiber.key === undefined) {
    throw new Error(
      `Component "${componentName}" uses useAsyncOutput but has no key.\n\n` +
        `Components with useAsyncOutput require a unique key for state persistence:\n\n` +
        keyHint(componentName),
    );
  }
}

/**
 * Any prop other than 'children' undefined?
 * (JSX always passes 'children', even when undefined)
 */
function hasUndefinedValues(props: Record<string, unknown>): boolean {
  return Object.entries(props).some(
    ([key, value]) => key !== "children" && value === undefined,
  );
}

/** Check for collisions (multiple instances with same resource path) */
function claimOwnership(
  ctx: RuntimeContext,
  nodeId: string,
  fiber: Fiber,
  componentName: string,
): void {
  const currentFiberPath = fiber.path.join(".");
  const existingOwnerPath = ctx.nodeOwnership.get(nodeId);
  if (existingOwnerPath && existingOwnerPath !== currentFiberPath) {
    throw new Error(
      `Duplicate resource ID "${nodeId}".\n\n` +
        `Multiple ${componentName} components share the same resource path.\n` +
        `Add a unique key to each instance:\n\n` +
        keyHint(componentName),
    );
  }
  ctx.nodeOwnership.set(nodeId, currentFiberPath);
}

/** Create or update one output signal, deduplicating shallow-equal writes */
function upsertOutputSignal(
  node: InstanceNode,
  key: string,
  value: unknown,
): void {
  if (!node.outputSignals.has(key)) {
    node.outputSignals.set(key, createSignal(value));
    return;
  }
  const [read, write] = node.outputSignals.get(key)!;
  if (!shallowEqual(read(), value)) {
    write(value);
  }
}

/** Build a fresh InstanceNode with its setOutputs implementation */
function createInstanceNode(
  nodeId: string,
  fullPath: string[],
  props: Record<string, any>,
  handler: Handler<any, any>,
): InstanceNode {
  const node: InstanceNode = {
    id: nodeId,
    path: fullPath,
    props,
    handler,
    outputSignals: new Map(),
    children: [],
    setOutputs(outputsOrFn) {
      // Support functional updates like React's setState
      const outputs =
        typeof outputsOrFn === "function"
          ? outputsOrFn(node.outputs)
          : outputsOrFn;

      if (!outputsDiffer(node, outputs)) return;

      node.outputs = { ...(node.outputs || {}), ...outputs };

      batch(() => {
        for (const [key, value] of Object.entries(outputs)) {
          upsertOutputSignal(node, key, value);
        }
      });
    },
  };
  return node;
}

/** Does any output differ from what its signal currently holds? */
function outputsDiffer(
  node: InstanceNode,
  outputs: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(outputs)) {
    if (!node.outputSignals.has(key)) return true;
    const [read] = node.outputSignals.get(key)!;
    if (!shallowEqual(read(), value)) return true;
  }
  return false;
}

/**
 * Hydrate outputs from a previous run, so setOutputs(prev => ...) sees them
 */
function hydrateNodeOutputs(
  ctx: RuntimeContext,
  node: InstanceNode,
  nodeId: string,
): void {
  const hydratedOutputs = ctx.outputHydration.get(nodeId);
  if (!hydratedOutputs) return;

  node.outputs = { ...hydratedOutputs };
  for (const [key, value] of Object.entries(hydratedOutputs)) {
    upsertOutputSignal(node, key, value);
  }
}

/**
 * Reactive (getter) props: track changes and update node.props.
 * Also upgrades deferred placeholders once their undefined deps resolve.
 */
function trackReactiveProps(
  ownerFiber: Fiber,
  node: InstanceNode,
  getProps: () => unknown,
): void {
  createEffect(() => applyReactiveProps(ownerFiber, node, getProps));
}

/** One reactive-props pass: refresh node.props, promote resolved deferreds */
function applyReactiveProps(
  ownerFiber: Fiber,
  node: InstanceNode,
  getProps: () => unknown,
): void {
  const newProps = getProps() as Record<string, unknown>;
  node.props = newProps;

  // Upgrade deferred placeholder → real instance node when deps resolve
  if (
    ownerFiber.hasPlaceholderInstance &&
    !ownerFiber.instanceNodes.includes(node) &&
    !hasUndefinedValues(newProps)
  ) {
    ownerFiber.hasPlaceholderInstance = false;
    ownerFiber.instanceNodes.push(node);
  }
}

/** Proxy exposing each output as a reactive accessor */
function createOutputProxy<O extends Record<string, any>>(
  node: InstanceNode,
): OutputAccessors<O> {
  return new Proxy({} as OutputAccessors<O>, {
    get(_, key: string) {
      if (!node.outputSignals.has(key)) {
        node.outputSignals.set(key, createSignal<unknown>());
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
export function getNodeById(
  nodeId: string,
  ctx?: RuntimeContext,
): InstanceNode | undefined {
  if (ctx) return ctx.nodeRegistry.get(nodeId);
  for (const c of allContexts) {
    const node = c.nodeRegistry.get(nodeId);
    if (node) return node;
  }
  return undefined;
}

/**
 * Get all registered nodes
 * @internal
 */
export function getAllNodes(): InstanceNode[] {
  const nodes: InstanceNode[] = [];
  for (const c of allContexts) {
    nodes.push(...c.nodeRegistry.values());
  }
  return nodes;
}

/**
 * Invoke a cleanup best-effort: absorb synchronous throws and async
 * rejections — teardown failures must never crash the process
 * @internal
 */
export function invokeCleanupSafely(fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.catch(() => {
        // best-effort
      });
    }
  } catch {
    // best-effort
  }
}

/**
 * Call all cleanup functions on registered nodes (best-effort, sync)
 * @internal
 */
export function callAllCleanupFunctions(ctx?: RuntimeContext): void {
  const contexts = ctx ? [ctx] : allContexts;
  for (const c of contexts) {
    for (const node of c.nodeRegistry.values()) {
      if (node.cleanupFn) {
        const fn = node.cleanupFn;
        node.cleanupFn = undefined;
        invokeCleanupSafely(fn);
      }
    }
  }
}

/**
 * Remove a deleted node from the registry and ownership maps.
 * Clears cleanupFn so later sweeps (dispose/resetRuntime) can't double-call it.
 * @internal
 */
export function removeNodeFromRegistry(
  nodeId: string,
  ctx: RuntimeContext = getActiveContext(),
): void {
  // Destructive — always scoped to one runtime's context. A cross-runtime
  // sweep could delete a same-id node from an unrelated runtime.
  const node = ctx.nodeRegistry.get(nodeId);
  if (node) {
    node.cleanupFn = undefined;
    ctx.nodeRegistry.delete(nodeId);
  }
  ctx.nodeOwnership.delete(nodeId);
}

/**
 * Clear node registry (for testing)
 * @internal
 */
export function clearNodeRegistry(): void {
  for (const c of allContexts) {
    c.nodeRegistry.clear();
    c.nodeOwnership.clear();
  }
}

/**
 * Clear node ownership (call at start of each render pass)
 * @internal
 */
export function clearNodeOwnership(
  ctx: RuntimeContext = getActiveContext(),
): void {
  ctx.nodeOwnership.clear();
}
