/**
 * Store - reactive nested state
 *
 * Creates a deeply reactive proxy where each property is tracked independently.
 * Changes trigger fine-grained updates only for the specific properties accessed.
 */

import type { Signal } from "../../src/reactive/signal";
import { getListener, scheduleComputation } from "../../src/reactive/tracking";

export type SetStoreFunction<T> = {
  <K extends keyof T>(key: K, value: T[K] | ((prev: T[K]) => T[K])): void;
  <K1 extends keyof T, K2 extends keyof T[K1]>(
    k1: K1,
    k2: K2,
    value: T[K1][K2] | ((prev: T[K1][K2]) => T[K1][K2]),
  ): void;
  (...args: any[]): void;
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
 * Create a reactive store
 *
 * Stores are not memoized - each call creates a new store.
 * Components run once, so this is expected behavior.
 */
export function createStore<T extends object>(
  initial: T,
): [T, SetStoreFunction<T>] {
  const state = structuredClone(initial);

  const node = createStoreNode(state);
  const proxy = node.proxy as T;

  function setStore(...args: any[]): void {
    if (args.length < 2) return;
    updateStorePath(proxy, args);
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

      const oldValue = Reflect.get(obj, prop);
      if (oldValue === value) return true;

      Reflect.set(obj, prop, value);
      notifyProperty(node, prop);

      if (typeof value === "object" && value !== null) {
        node.children.delete(prop);
      }

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

  const sSlot = signal.observers?.length ?? 0;

  if (!listener.sources) {
    listener.sources = [signal];
    listener.sourceSlots = [sSlot];
  } else {
    if (listener.sources.includes(signal)) return;
    listener.sources.push(signal);
    listener.sourceSlots?.push(sSlot);
  }

  if (!signal.observers) {
    signal.observers = [listener];
    signal.observerSlots = [listener.sources.length - 1];
  } else {
    signal.observers.push(listener);
    signal.observerSlots?.push(listener.sources.length - 1);
  }
}

function notifyProperty(node: StoreNode, prop: string | symbol): void {
  const signal = node.signals.get(prop);
  if (!signal?.observers?.length) return;

  for (const observer of signal.observers) {
    observer.state = 1; // STALE
    scheduleComputation(observer);
  }
}

function setPropertyAtPath(
  node: StoreNode,
  prop: string | symbol,
  value: unknown,
): void {
  const obj = node.target as Record<string | symbol, unknown>;
  const oldValue = obj[prop];

  const newValue = typeof value === "function" ? value(oldValue) : value;

  if (oldValue === newValue) return;

  obj[prop] = newValue;

  if (typeof newValue === "object" && newValue !== null) {
    node.children.delete(prop);
  }

  notifyProperty(node, prop);
}

function updateStorePath(proxy: any, args: any[]): void {
  if (args.length === 2) {
    const [key, value] = args;
    const node = proxy[$NODE] as StoreNode | undefined;
    if (node) {
      setPropertyAtPath(node, key, value);
    }
  } else if (args.length > 2) {
    const key = args[0];
    const nested = proxy[key];
    if (nested && typeof nested === "object") {
      updateStorePath(nested, args.slice(1));
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

// Hydration map for restoring state from Memory
const hydrationMap: Map<string, any> = new Map();

/**
 * Prepare hydration from previous nodes
 * @internal
 */
export function prepareHydration(previousNodes: any[]): void {
  hydrationMap.clear();

  for (const node of flattenNodes(previousNodes)) {
    if (node.store) {
      const componentPath = node.path.slice(0, -1).join(".");
      hydrationMap.set(componentPath, node.store);
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
  const stored = hydrationMap.get(key);
  return stored ? structuredClone(stored) : undefined;
}

function flattenNodes(nodes: any[]): any[] {
  const result: any[] = [];

  function walk(node: any): void {
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
export function clearHydration(): void {
  hydrationMap.clear();
}
