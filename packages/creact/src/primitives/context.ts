/**
 * Context - pass values down the component tree
 *
 * Owner-based context lookup for CReact reactivity.
 */

import { lookupContext, setContext } from "../reactive/owner";

export interface Context<T> {
  id: symbol;
  defaultValue: T | undefined;
  Provider: (props: { value: T; children: any }) => any;
}

// Stack of values per context ID (used during render traversal)
const contextStacks = new Map<symbol, any[]>();

/**
 * Create a context for passing values down the tree
 */
export function createContext<T>(defaultValue?: T): Context<T> {
  const id = Symbol("context");

  const Provider = (props: { value: T; children: any }) => {
    return {
      type: Provider,
      props,
      __context: id,
      __isProvider: true,
    };
  };

  return {
    id,
    defaultValue,
    Provider,
  };
}

/**
 * Read a context value
 *
 * First checks the Owner chain (for reactive contexts),
 * then falls back to render-time context stacks.
 */
export function useContext<T>(context: Context<T>): T {
  // Try Owner-based lookup first
  const ownerValue = lookupContext<T>(context.id);
  if (ownerValue !== undefined) {
    return ownerValue;
  }

  // Fall back to render-time stack
  const stack = contextStacks.get(context.id);
  if (stack?.length) {
    return stack[stack.length - 1];
  }

  return context.defaultValue as T;
}

/**
 * Push a context value (called by renderer)
 * @internal
 */
export function pushContext<T>(contextId: symbol, value: T): void {
  let stack = contextStacks.get(contextId);
  if (!stack) {
    stack = [];
    contextStacks.set(contextId, stack);
  }
  stack.push(value);

  // Also set on current Owner for reactive access
  setContext(contextId, value);
}

/**
 * Pop a context value (called by renderer)
 * @internal
 */
export function popContext(contextId: symbol): void {
  const stack = contextStacks.get(contextId);
  stack?.pop();
}

/**
 * Clear all context stacks (for testing)
 * @internal
 */
export function clearContextStacks(): void {
  contextStacks.clear();
}

/**
 * Snapshot of context state at a point in time
 */
export type ContextSnapshot = Map<symbol, any[]>;

/**
 * Capture current context state
 * @internal
 */
export function getContextSnapshot(): ContextSnapshot {
  const snapshot: ContextSnapshot = new Map();
  for (const [id, stack] of contextStacks) {
    snapshot.set(id, [...stack]);
  }
  return snapshot;
}

/**
 * Restore context state from a snapshot
 * @internal
 */
export function restoreContextSnapshot(snapshot: ContextSnapshot): void {
  contextStacks.clear();
  for (const [id, stack] of snapshot) {
    contextStacks.set(id, [...stack]);
  }
}
