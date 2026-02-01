/**
 * Store - persistent state (non-reactive)
 */

import { getCurrentFiber } from '../runtime/render';

// Hydration map for restoring state across cycles
// biome-ignore lint/suspicious/noExplicitAny: stores hold user-defined state of any type
const hydrationMap: Map<string, any> = new Map();

export type SetStoreFunction<T> = {
  <K extends keyof T>(key: K, value: T[K] | ((prev: T[K]) => T[K])): void;
  <K1 extends keyof T, K2 extends keyof T[K1]>(
    k1: K1,
    k2: K2,
    value: T[K1][K2] | ((prev: T[K1][K2]) => T[K1][K2]),
  ): void;
  // biome-ignore lint/suspicious/noExplicitAny: rest args for deep path updates
  (...args: any[]): void;
};

/**
 * Create a persistent store (non-reactive)
 */
export function createStore<T extends object>(initial: T): [T, SetStoreFunction<T>] {
  const fiber = getCurrentFiber();

  // Try to hydrate from previous cycle
  const hydrated = fiber ? hydrateStore<T>(fiber.path) : undefined;
  const state = hydrated ?? { ...initial };

  // Mark for persistence
  if (fiber) {
    fiber.store = state;
  }

  // biome-ignore lint/suspicious/noExplicitAny: rest args for deep path updates
  function setStore(...args: any[]): void {
    updatePath(state, args);
  }

  return [state, setStore as SetStoreFunction<T>];
}

/**
 * Update a nested path in an object
 */
// biome-ignore lint/suspicious/noExplicitAny: operates on arbitrary nested objects
function updatePath(obj: any, args: any[]): void {
  if (args.length === 2) {
    const [key, value] = args;
    obj[key] = typeof value === 'function' ? value(obj[key]) : value;
  } else if (args.length > 2) {
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
// biome-ignore lint/suspicious/noExplicitAny: accepts serialized nodes with arbitrary structure
export function prepareHydration(previousNodes: any[]): void {
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
 * Returns a deep clone to ensure previous and current stores are independent
 */
function hydrateStore<T>(fiberPath?: string[]): T | undefined {
  if (!fiberPath) return undefined;
  const key = fiberPath.join('.');
  const stored = hydrationMap.get(key);
  // Deep clone to ensure independence between runs
  return stored ? JSON.parse(JSON.stringify(stored)) : undefined;
}

/**
 * Flatten nested nodes
 */
// biome-ignore lint/suspicious/noExplicitAny: operates on serialized nodes with arbitrary structure
function flattenNodes(nodes: any[]): any[] {
  // biome-ignore lint/suspicious/noExplicitAny: accumulates serialized nodes
  const result: any[] = [];

  // biome-ignore lint/suspicious/noExplicitAny: serialized node structure
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
