/**
 * CurrentOwner slot — the single mutable owner context for the reactive system.
 *
 * Lives in its own dependency-free module so both owner.ts (scope management)
 * and tracking.ts (computation execution) can share it without a circular
 * import between them.
 */

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
