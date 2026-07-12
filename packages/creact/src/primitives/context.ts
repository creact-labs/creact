/**
 * Context - pass values down the component tree
 *
 * Owner-based context lookup for CReact reactivity. The render-time value
 * stacks live on the active runtime context, so concurrent runtimes never
 * see each other's providers.
 */

import { lookupContext, setContext } from "../reactive/owner";
import { getActiveContext } from "../runtime/runtime-context";

/** Element shape produced by a context Provider (consumed by the renderer) */
export interface ProviderElement<T> {
  type: (props: { value: T; children: unknown }) => ProviderElement<T>;
  props: { value: T; children: unknown };
  __context: symbol;
  __isProvider: true;
}

export interface Context<T> {
  id: symbol;
  defaultValue: T | undefined;
  Provider: (props: { value: T; children: unknown }) => ProviderElement<T>;
}

/** Stacks of values per context ID for the currently rendering runtime */
function contextStacks(): Map<symbol, unknown[]> {
  return getActiveContext().contextStacks;
}

/**
 * Create a context for passing values down the tree
 *
 * Without a default value the context can resolve to undefined, and the
 * type reflects that — consumers must handle the missing-provider case.
 */
export function createContext<T>(): Context<T | undefined>;
export function createContext<T>(defaultValue: T): Context<T>;
export function createContext<T>(defaultValue?: T): Context<T | undefined> {
  const id = Symbol("context");

  const Provider = (props: {
    value: T | undefined;
    children: unknown;
  }): ProviderElement<T | undefined> => {
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
  // Try Owner-based lookup first — presence-tracked, so a provider that
  // intentionally supplies undefined wins over the stack/default fallback
  const ownerEntry = lookupContext<T>(context.id);
  if (ownerEntry) {
    return ownerEntry.value;
  }

  // Fall back to render-time stack. Values are stored untyped because one
  // map holds every context's stack; each context id only ever receives
  // values pushed through its own typed Provider.
  const stack = contextStacks().get(context.id);
  if (stack?.length) {
    return stack[stack.length - 1] as T;
  }

  return context.defaultValue as T;
}

/**
 * Push a context value (called by renderer)
 * @internal
 */
export function pushContext<T>(contextId: symbol, value: T): void {
  const stacks = contextStacks();
  let stack = stacks.get(contextId);
  if (!stack) {
    stack = [];
    stacks.set(contextId, stack);
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
  const stack = contextStacks().get(contextId);
  stack?.pop();
}

/**
 * Clear the active runtime's context stacks (for testing)
 * @internal
 */
export function clearContextStacks(): void {
  contextStacks().clear();
}

/**
 * Snapshot of context state at a point in time
 */
export type ContextSnapshot = Map<symbol, unknown[]>;

/**
 * Capture current context state
 * @internal
 */
export function getContextSnapshot(): ContextSnapshot {
  const snapshot: ContextSnapshot = new Map();
  for (const [id, stack] of contextStacks()) {
    snapshot.set(id, [...stack]);
  }
  return snapshot;
}

/**
 * Restore context state from a snapshot
 * @internal
 */
export function restoreContextSnapshot(snapshot: ContextSnapshot): void {
  const stacks = contextStacks();
  stacks.clear();
  for (const [id, stack] of snapshot) {
    stacks.set(id, [...stack]);
  }
}
