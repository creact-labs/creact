/**
 * Owner - ownership and cleanup tracking for reactive system
 *
 * The CurrentOwner slot itself lives in current-owner.ts so that
 * tracking.ts can flip owners without importing this module (which
 * would create an import cycle).
 */

import { getOwner, type Owner, setOwner } from "./current-owner";
import { runUpdates, setListener, untrack } from "./tracking";

export { getOwner, type Owner, setOwner };

// Late-bound handleError to avoid circular dependency with signal.ts
let _handleError: ((err: unknown) => void) | null = null;

/**
 * Set the handleError function (called from signal.ts)
 * @internal
 */
export function setOwnerHandleError(fn: (err: unknown) => void): void {
  _handleError = fn;
}

/** Sentinel for unowned root */
const UNOWNED: Owner = {
  owned: null,
  cleanups: null,
  context: null,
  owner: null,
};

/**
 * Run a function with a specific owner context
 * Clears Listener and uses runUpdates for proper batching
 */
export function runWithOwner<T>(o: Owner | null, fn: () => T): T | undefined {
  const prev = setOwner(o);
  const prevListener = setListener(null); // Clear listener - critical!

  try {
    return runUpdates(fn, true)!;
  } catch (err) {
    if (_handleError) _handleError(err);
    else throw err;
  } finally {
    setOwner(prev);
    setListener(prevListener);
  }
  return undefined;
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
  const owner = getOwner();
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

  setOwner(root);

  try {
    return runUpdates(() => fn(() => untrack(() => cleanupOwner(root))), true)!;
  } finally {
    setListener(listener);
    setOwner(owner);
  }
}

/**
 * Register a cleanup function on the current owner/computation
 * (Computation extends Owner, so this also works inside effects).
 * Returns the function for chaining.
 */
export function onCleanup<T extends () => unknown>(fn: T): T {
  const owner = getOwner();
  if (owner === null) {
    console.warn(
      "cleanups created outside a `createRoot` or `render` will never be run",
    );
  } else if (owner.cleanups === null) {
    owner.cleanups = [fn];
  } else {
    owner.cleanups.push(fn);
  }
  return fn;
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

  runOwnerCleanups(owner);
}

/** Run registered cleanup functions in reverse order, best-effort */
function runOwnerCleanups(owner: Owner): void {
  if (!owner.cleanups) return;

  // onCleanup only ever pushes functions, so entries are always callable
  for (let i = owner.cleanups.length - 1; i >= 0; i--) {
    try {
      owner.cleanups[i]!();
    } catch (e) {
      console.error("[CReact] Error in cleanup:", e);
    }
  }
  owner.cleanups = null;
}

/**
 * Look up a context entry in the owner chain.
 * The hit is wrapped so a provider intentionally supplying undefined is
 * distinguishable from an absent entry (null = no provider in the chain).
 * @internal
 */
export function lookupContext<T>(key: symbol): { value: T } | null {
  let current = getOwner();
  while (current) {
    if (current.context && key in current.context) {
      return { value: current.context[key] as T };
    }
    current = current.owner;
  }
  return null;
}

/**
 * Set a context value on the current owner
 * @internal
 */
export function setContext(key: symbol, value: unknown): void {
  const owner = getOwner();
  if (owner) {
    if (!owner.context) owner.context = {};
    owner.context[key] = value;
  }
}
