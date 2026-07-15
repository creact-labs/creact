/**
 * Store - reactive nested state
 *
 * Creates a deeply reactive proxy where each property is tracked independently.
 * Changes trigger fine-grained updates only for the specific properties accessed.
 */

import type { Signal } from "../reactive/signal";
import {
  getListener,
  markDownstream,
  runUpdates,
  scheduleComputation,
  trackRead,
} from "../reactive/tracking";
import {
  getActiveContext,
  type RuntimeContext,
} from "../runtime/runtime-context";

export type SetStoreFunction<T> = {
  <K extends keyof T>(key: K, value: T[K] | ((prev: T[K]) => T[K])): void;
  <K1 extends keyof T, K2 extends keyof T[K1]>(
    k1: K1,
    k2: K2,
    value: T[K1][K2] | ((prev: T[K1][K2]) => T[K1][K2]),
  ): void;
  // Catch-all for paths deeper than two levels
  (...args: unknown[]): void;
};

// Symbol to access the internal node
const $NODE = Symbol("store-node");

// Symbol to access raw unwrapped value
const $RAW = Symbol("store-raw");

// Dev mode flag
const IS_DEV = process.env.NODE_ENV !== "production";

type StoreNode = {
  signals: Map<string | symbol, Signal<unknown>>;
  children: Map<string | symbol, StoreNode>;
  target: object;
  proxy: object;
};

const proxyCache = new WeakMap<object, StoreNode>();

/**
 * Late-bound runtime integration (set by the renderer): attaches a new
 * store's state to the fiber being rendered so it persists to Memory, and
 * returns previously persisted state to hydrate from. Late-bound because
 * the store package must not depend on the runtime package.
 */
type StoreAttachHook = (initial: object) => object | undefined;
let storeAttachHook: StoreAttachHook | null = null;

/** @internal */
export function setStoreAttachHook(fn: StoreAttachHook | null): void {
  storeAttachHook = fn;
}

/**
 * Create a reactive store
 *
 * Stores are not memoized - each call creates a new store.
 * Components run once, so this is expected behavior.
 *
 * Inside a component, the store's state is persisted to Memory alongside the
 * component's resource and restored on the next boot. Call createStore
 * before useAsyncOutput so the persisted state is keyed consistently.
 */
export function createStore<T extends object>(
  initial: T,
): [T, SetStoreFunction<T>] {
  const cloned = structuredClone(initial);
  // Rendering a component: attach to its fiber and prefer persisted state
  const state = ((storeAttachHook?.(cloned) as T | undefined) ?? cloned) as T;

  const node = createStoreNode(state);
  const proxy = node.proxy as T;

  function setStore(...args: unknown[]): void {
    if (args.length < 2) return;
    updateStorePath(proxy as Record<PropertyKey, unknown>, args);
  }

  return [proxy, setStore as SetStoreFunction<T>];
}

function createStoreNode(target: object): StoreNode {
  const existing = proxyCache.get(target);
  if (existing) return existing;

  const node: StoreNode = {
    signals: new Map(),
    children: new Map(),
    target,
    proxy: null as unknown as object,
  };

  const proxy = new Proxy(target, {
    get(obj, prop) {
      if (prop === $NODE) {
        return node;
      }

      if (prop === $RAW) {
        return obj;
      }

      const value = Reflect.get(obj, prop);

      if (typeof prop === "symbol" || prop === "constructor") {
        return value;
      }

      trackProperty(node, prop);

      if (value !== null && typeof value === "object") {
        let childNode = node.children.get(prop);
        if (!childNode) {
          childNode = createStoreNode(value);
          node.children.set(prop, childNode);
        }
        return childNode.proxy;
      }

      return value;
    },

    set(obj, prop, value) {
      if (IS_DEV) {
        console.error(
          `[CReact] Direct store mutation detected: store.${String(prop)} = ...`,
          "\n       Use setStore() instead:",
          `setStore("${String(prop)}", value)`,
        );
        throw new Error(
          `Cannot mutate store directly. Use setStore("${String(prop)}", value) instead.`,
        );
      }

      // A store proxy must never land in a raw target: later nested writes
      // would hit its mutation guard, and structuredClone (unwrap,
      // persistence) rejects proxies — snapshot it to raw data instead
      const newValue =
        value !== null && typeof value === "object" ? unwrap(value) : value;

      const oldValue = Reflect.get(obj, prop);
      if (oldValue === newValue) return true;

      Reflect.set(obj, prop, newValue);

      // Drop the cached child node before notifying: a synchronously
      // re-run observer must read a fresh child proxy, and a replaced
      // object (by primitive, null, or anything else) must not stay
      // strongly retained through the stale cache entry
      node.children.delete(prop);
      notifyProperty(node, prop);

      return true;
    },

    deleteProperty(obj, prop) {
      if (IS_DEV) {
        throw new Error(
          `Cannot delete store property directly. Use setStore("${String(prop)}", undefined) instead.`,
        );
      }

      const hadKey = prop in obj;
      const deleted = Reflect.deleteProperty(obj, prop);

      if (hadKey) {
        notifyProperty(node, prop);
        node.children.delete(prop);
      }

      return deleted;
    },
  });

  node.proxy = proxy;
  proxyCache.set(target, node);

  return node;
}

function trackProperty(node: StoreNode, prop: string | symbol): void {
  const listener = getListener();
  if (!listener) return;

  let signal = node.signals.get(prop);
  if (!signal) {
    signal = {
      value: undefined,
      observers: null,
      observerSlots: null,
    };
    node.signals.set(prop, signal);
  }

  // Re-reading the same property within one computation must not
  // double-subscribe
  if (listener.sources?.includes(signal)) return;

  trackRead(signal, listener);
}

function notifyProperty(node: StoreNode, prop: string | symbol): void {
  const signal = node.signals.get(prop);
  if (!signal?.observers?.length) return;

  // Wrap in runUpdates so observers actually execute even when no batch is
  // active (mirrors signal write semantics) — otherwise a setStore call from
  // a plain async callback marks observers stale but never runs them
  runUpdates(() => markStoreObserversStale(signal), false);
}

/** Mark every observer of a store property stale and schedule it */
function markStoreObserversStale(signal: Signal<unknown>): void {
  for (let i = 0; i < signal.observers!.length; i++) {
    const observer = signal.observers![i]!;
    if (!observer.state) {
      scheduleComputation(observer);
      // memo-like observers fan out to their own observers
      if ((observer as { observers?: unknown }).observers)
        markDownstream(observer);
    }
    observer.state = 1; // STALE
  }
}

function setPropertyAtPath(
  node: StoreNode,
  prop: string | symbol,
  value: unknown,
): void {
  const obj = node.target as Record<string | symbol, unknown>;
  const oldValue = obj[prop];

  let newValue = typeof value === "function" ? value(oldValue) : value;
  // A store proxy must never land in a raw target: later nested writes
  // would hit its mutation guard, and structuredClone (unwrap, persistence)
  // rejects proxies — snapshot it to raw data instead
  if (newValue !== null && typeof newValue === "object") {
    newValue = unwrap(newValue);
  }

  if (oldValue === newValue) return;

  obj[prop] = newValue;

  // Drop the cached child node before notifying: a synchronously re-run
  // observer must read a fresh child proxy, and a replaced object (by
  // primitive, null, or anything else) must not stay strongly retained
  // through the stale cache entry
  node.children.delete(prop);
  notifyProperty(node, prop);
}

function updateStorePath(
  proxy: Record<PropertyKey, unknown>,
  args: readonly unknown[],
): void {
  if (args.length === 2) {
    const [key, value] = args;
    const node = proxy[$NODE] as StoreNode | undefined;
    if (node) {
      setPropertyAtPath(node, key as string | symbol, value);
    }
  } else if (args.length > 2) {
    const key = args[0] as PropertyKey;
    const nested = proxy[key];
    if (nested && typeof nested === "object") {
      updateStorePath(nested as Record<PropertyKey, unknown>, args.slice(1));
    }
  }
}

/**
 * Get the unwrapped raw value from a store proxy
 */
export function unwrap<T>(item: T): T {
  if (item !== null && typeof item === "object") {
    const raw = (item as Record<symbol, unknown>)[$RAW];
    if (raw !== undefined) {
      return structuredClone(raw) as T;
    }
  }
  return item;
}

// The store hydration map lives on each RuntimeContext — helpers below
// default to the active context but accept an explicit one.

/**
 * The structural surface hydration needs from persisted nodes
 * @internal
 */
export interface HydratableNode {
  path: string[];
  store?: object;
  children?: HydratableNode[];
}

/**
 * Prepare hydration from previous nodes
 * @internal
 */
export function prepareHydration(
  previousNodes: HydratableNode[],
  ctx: RuntimeContext = getActiveContext(),
): void {
  ctx.storeHydration.clear();

  for (const node of flattenNodes(previousNodes)) {
    if (node.store) {
      const componentPath = node.path.slice(0, -1).join(".");
      ctx.storeHydration.set(componentPath, node.store);
    }
  }
}

/**
 * Hydrate store from Memory
 * @internal
 */
export function hydrateStore<T>(fiberPath?: string[]): T | undefined {
  if (!fiberPath) return undefined;
  const key = fiberPath.join(".");
  const stored = getActiveContext().storeHydration.get(key);
  // Persisted store state carries no type information — the caller declares
  // the shape it originally stored.
  return stored ? (structuredClone(stored) as T) : undefined;
}

function flattenNodes(nodes: HydratableNode[]): HydratableNode[] {
  const result: HydratableNode[] = [];

  function walk(node: HydratableNode): void {
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
export function clearHydration(
  ctx: RuntimeContext = getActiveContext(),
): void {
  ctx.storeHydration.clear();
}
