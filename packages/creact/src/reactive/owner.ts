/**
 * Owner - ownership and cleanup tracking for reactive system
 */

import { runUpdates, setListener, untrack } from "./tracking";

// Late-bound handleError to avoid circular dependency with signal.ts
let _handleError: ((err: unknown) => void) | null = null;

/**
 * Set the handleError function (called from signal.ts)
 * @internal
 */
export function setOwnerHandleError(fn: (err: unknown) => void): void {
  _handleError = fn;
}

/**
 * Owner represents a reactive scope that owns computations and cleanups
 * Computation extends Owner - computations can own other computations
 */
export interface Owner {
  /** Child owners/computations owned by this owner */
  owned: Owner[] | null;
  /** Cleanup functions to run when this owner is disposed */
  cleanups: (() => void)[] | null;
  /** Parent owner in the ownership chain */
  owner: Owner | null;
  /** Context values accessible in this scope */
  context: Record<symbol, unknown> | null;
}

/** Current owner in the reactive system */
let CurrentOwner: Owner | null = null;

/** Sentinel for unowned root */
const UNOWNED: Owner = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null,
};

/**
 * Get the current owner
 */
export function getOwner(): Owner | null {
  return CurrentOwner;
}

/**
 * Set the current owner (internal use)
 * @internal
 */
export function setOwner(owner: Owner | null): Owner | null {
  const prev = CurrentOwner;
  CurrentOwner = owner;
  return prev;
}

/**
 * Run a function with a specific owner context
 * Clears Listener and uses runUpdates for proper batching
 */
export function runWithOwner<T>(o: Owner | null, fn: () => T): T | undefined {
  const prev = CurrentOwner;
  const prevListener = setListener(null); // Clear listener - critical!
  CurrentOwner = o;

  try {
    return runUpdates(fn, true)!;
  } catch (err) {
    if (_handleError) _handleError(err);
    else throw err;
    return undefined;
  } finally {
    CurrentOwner = prev;
    setListener(prevListener);
  }
}

/**
 * Create a new reactive root scope
 * Clears Listener and uses runUpdates for proper batching.
 * Root is not registered with parent owner - it creates an independent scope.
 *
 * @param fn - Function to run within the root scope, receives dispose function
 * @param detachedOwner - Optional parent owner to attach to
 * @returns The result of fn
 */
export function createRoot<T>(
  fn: (dispose: () => void) => T,
  detachedOwner?: Owner,
): T {
  const listener = setListener(null); // Save and clear listener
  const owner = CurrentOwner;
  const unowned = fn.length === 0;
  const current = detachedOwner === undefined ? owner : detachedOwner;

  const root: Owner = unowned
    ? UNOWNED
    : {
        owned: null,
        cleanups: null,
        context: current ? current.context : null,
        owner: current,
      };

  // Root is not registered with parent - createRoot creates an independent scope

  CurrentOwner = root;

  try {
    return runUpdates(() => fn(() => untrack(() => cleanupOwner(root))), true)!;
  } finally {
    setListener(listener);
    CurrentOwner = owner;
  }
}

/**
 * Register a cleanup function on the current owner
 */
export function onCleanup(fn: () => void): void {
  if (CurrentOwner === null) {
    console.warn(
      "cleanups created outside a `createRoot` or `render` will never be run",
    );
  } else if (CurrentOwner.cleanups === null) {
    CurrentOwner.cleanups = [fn];
  } else {
    CurrentOwner.cleanups.push(fn);
  }
}

/**
 * Clean up an owner and all its children
 * @internal
 */
export function cleanupOwner(owner: Owner): void {
  // Clean up child owners first (reverse order)
  if (owner.owned) {
    for (let i = owner.owned.length - 1; i >= 0; i--) {
      const child = owner.owned[i];
      if (child) cleanupOwner(child);
    }
    owner.owned = null;
  }

  // Run cleanup functions
  if (owner.cleanups) {
    for (let i = owner.cleanups.length - 1; i >= 0; i--) {
      const cleanup = owner.cleanups[i];
      if (cleanup) {
        try {
          cleanup();
        } catch (e) {
          console.error("[CReact] Error in cleanup:", e);
        }
      }
    }
    owner.cleanups = null;
  }
}

/**
 * Look up a context value in the owner chain
 * @internal
 */
export function lookupContext<T>(key: symbol): T | undefined {
  let current = CurrentOwner;
  while (current) {
    if (current.context && key in current.context) {
      return current.context[key] as T;
    }
    current = current.owner;
  }
  return undefined;
}

/**
 * Set a context value on the current owner
 * @internal
 */
export function setContext(key: symbol, value: unknown): void {
  if (CurrentOwner) {
    if (!CurrentOwner.context) CurrentOwner.context = {};
    CurrentOwner.context[key] = value;
  }
}
