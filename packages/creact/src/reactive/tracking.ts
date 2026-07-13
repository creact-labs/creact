/**
 * Global tracking context for reactive system
 */

import type { Owner } from "./current-owner";
import { setOwner } from "./current-owner";
import type { Computation, Signal } from "./signal";

// Computation<any> throughout this module is deliberate: the scheduler
// manages heterogeneous computations whose value types are unrelated, and
// Computation<T> is invariant in T (fn takes and returns T), so neither
// unknown nor a union can hold the graph. Solid's scheduler types these
// collections the same way.

/**
 * A computation that is also a signal (memo): carries downstream observers
 * and a comparator on top of the Computation fields. Optional so plain
 * Computation values flow in unchanged — callers gate on `observers`.
 */
type MemoLike = Computation<any> & {
  observers?: Computation<any>[] | null;
  observerSlots?: number[] | null;
  comparator?: (prev: any, next: any) => boolean;
};

// Computation states
export const STALE = 1;
const PENDING = 2;

// Currently executing computation (for dependency tracking)
let Listener: Computation<any> | null = null;

// Dual queue system: Updates for pure computations, Effects for side effects
let Updates: Computation<any>[] | null = null;
let Effects: Computation<any>[] | null = null;

// Execution counter for update cycle tracking
let ExecCount = 0;

// Callbacks for when computations are flushed (for runtime integration)
// A Set so multiple concurrent runtimes each receive flushes independently.
const onFlushCallbacks = new Set<() => void>();

// Late-bound error handler (set by signal.ts to avoid circular imports)
let handleErrorFn: ((err: unknown, owner: Owner | null) => void) | null = null;

/**
 * Register the error handler (called from signal.ts at module init)
 * @internal
 */
export function registerHandleError(
  fn: (err: unknown, owner: Owner | null) => void,
): void {
  handleErrorFn = fn;
}

/**
 * Register a callback to be called after computations are flushed
 * Used by runtime to re-collect nodes after reactive updates
 */
export function addFlushCallback(callback: () => void): void {
  onFlushCallbacks.add(callback);
}

/**
 * Remove a previously registered flush callback
 */
export function removeFlushCallback(callback: () => void): void {
  onFlushCallbacks.delete(callback);
}

/**
 * Register a signal read on the current listener: the listener tracks the
 * signal as a source, and the signal tracks the listener as an observer
 * (slot indices kept in sync for O(1) unsubscription).
 * Shared by createSignal, createMemo, and store property tracking.
 * @internal
 */
export function trackRead(
  signal: Pick<Signal<any>, "observers" | "observerSlots">,
  listener: Computation<any>,
): void {
  const sSlot = signal.observers?.length ?? 0;

  if (!listener.sources) {
    listener.sources = [signal as Signal<any>];
    listener.sourceSlots = [sSlot];
  } else {
    listener.sources.push(signal as Signal<any>);
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

/**
 * Set the current listener (computation being executed)
 */
export function setListener(
  comp: Computation<any> | null,
): Computation<any> | null {
  const prev = Listener;
  Listener = comp;
  return prev;
}

/**
 * Get current listener
 */
export function getListener(): Computation<any> | null {
  return Listener;
}

/**
 * Schedule a computation to run (for signal writes)
 * Pushes to Updates (pure) or Effects based on computation type
 */
export function scheduleComputation(comp: Computation<any>): void {
  if (!comp.state) {
    if (comp.pure) Updates?.push(comp);
    else Effects?.push(comp);
  }
}

/**
 * Unconditionally push a computation to the update queue
 * Used by createSelector to directly notify matched subscribers
 * @internal
 */
export function scheduleUpdate(comp: Computation<any>): void {
  if (comp.pure) Updates?.push(comp);
  else Effects?.push(comp);
}

/**
 * Schedule an effect to run
 * Effects are queued or run immediately if no batch
 */
export function scheduleEffect(comp: Computation<any>): void {
  if (Effects) {
    Effects.push(comp);
  } else {
    updateComputation(comp);
  }
}

/**
 * Resolve a PENDING computation's upstream dependencies
 * Called when reading a memo that is in PENDING state
 * @internal
 */
export function resolvePending(node: Computation<any>): void {
  const updates = Updates;
  Updates = null;
  runUpdates(() => lookUpstream(node), false);
  Updates = updates;
}

/**
 * Run updates with batching support
 * This is the core of CReact's reactive batching
 */
export function runUpdates<T>(fn: () => T, init: boolean): T | undefined {
  if (Updates) return fn();

  let wait = false;
  if (!init) Updates = [];
  if (Effects) wait = true;
  else Effects = [];
  ExecCount++;

  try {
    const res = fn();
    completeUpdates(wait);
    return res;
  } catch (err) {
    if (!wait) Effects = null;
    Updates = null;
    throw err;
  }
}

/**
 * Complete pending updates - run queued computations
 */
function completeUpdates(wait: boolean): void {
  if (Updates) {
    runQueue(Updates);
    Updates = null;
  }
  if (wait) return;

  const e = Effects!;
  Effects = null;
  if (e.length) runUpdates(() => runEffects(e), false);

  // Notify runtimes that computations were flushed
  for (const callback of onFlushCallbacks) {
    callback();
  }
}

/**
 * Run a queue of computations
 */
function runQueue(queue: Computation<any>[]): void {
  for (let i = 0; i < queue.length; i++) {
    runTop(queue[i]!);
    // Infinite loop detection
    if (i > 10e5) {
      queue.length = 0;
      throw new Error("Potential infinite loop detected.");
    }
  }
}

/**
 * Run effects queue.
 * No runaway guard needed here: unlike runQueue (which iterates the live
 * Updates array), this iterates a detached snapshot — new effects scheduled
 * while it runs go to a fresh Effects array, so `queue` cannot grow.
 */
function runEffects(queue: Computation<any>[]): void {
  for (let i = 0; i < queue.length; i++) {
    runTop(queue[i]!);
  }
}

/**
 * Run a computation from the top of its dependency chain
 */
function runTop(node: Computation<any>): void {
  if (node.state === 0) return;
  if (node.state === PENDING) {
    lookUpstream(node);
    return;
  }

  // Owning computations have always completed at least one run by the time
  // an owned child is scheduled (children are created during that run), so
  // updatedAt is never null here. And because markDownstream enqueues every
  // PENDING pure computation into Updates — which fully drains before any
  // effect executes — an ancestor can only be CLEAN or STALE at this point.
  const ancestors: Computation<any>[] = [node];
  while (
    (node = node.owner as Computation<any>) &&
    node.updatedAt! < ExecCount
  ) {
    if (node.state) ancestors.push(node);
  }

  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i]!;
    if (node.state === STALE) {
      updateComputation(node);
    }
  }
}

/**
 * Look upstream for stale sources
 */
function lookUpstream(node: Computation<any>): void {
  node.state = 0;

  // PENDING is only ever set on observers (markDownstream), and observing
  // anything guarantees a sources array exists
  for (let i = 0; i < node.sources!.length; i++) {
    const source = node.sources![i] as MemoLike;
    if (source.sources) {
      const state = source.state;
      if (state === STALE) {
        // Memos run at creation, so updatedAt is always set; skip sources
        // already brought up to date in this cycle
        if (source.updatedAt! < ExecCount) {
          runTop(source);
        }
      } else if (state === PENDING) {
        lookUpstream(source);
      }
    }
  }
}

/**
 * Mark downstream observers as pending.
 * Callers check `node.observers` before calling, so it is always non-null.
 */
export function markDownstream(node: MemoLike): void {
  for (let i = 0; i < node.observers!.length; i++) {
    const o = node.observers![i]! as MemoLike;
    if (!o.state) {
      o.state = PENDING;
      if (o.pure) Updates?.push(o);
      else Effects?.push(o);
      if (o.observers) markDownstream(o);
    }
  }
}

/**
 * Update a computation - clean it and run it.
 * Every scheduled node has an fn (owners without fn are never queued —
 * runTop filters the ancestor walk on `node.state`, which owners lack).
 */
export function updateComputation(node: Computation<any>): void {
  cleanComputation(node);
  const time = ExecCount;
  runComputation(node, node.value, time);
}

/**
 * Run a computation with tracking
 * Sets both Listener (for dependency tracking) and Owner (for onCleanup/ownership)
 */
function runComputation(
  node: Computation<any>,
  value: unknown,
  time: number,
): void {
  let nextValue: unknown;
  const prevListener = Listener;
  const prevOwner = setOwner(node);
  Listener = node;

  try {
    nextValue = node.fn(value);
  } catch (err) {
    resetPureOnError(node);
    node.updatedAt = time + 1;
    Listener = prevListener;
    setOwner(prevOwner);
    // Route errors through owner chain (catchError boundaries)
    if (handleErrorFn) {
      handleErrorFn(err, node);
      return;
    }
    throw err;
  }

  Listener = prevListener;
  setOwner(prevOwner);

  commitComputationValue(node, nextValue, time);
}

/**
 * A pure computation that threw goes back to STALE with its owned
 * computations cleaned, so it can re-run cleanly next time
 */
function resetPureOnError(node: Computation<any>): void {
  if (!node.pure) return;
  node.state = STALE;
  if (node.owned) {
    for (let i = node.owned.length - 1; i >= 0; i--) {
      cleanComputation(node.owned[i] as Computation<any>);
    }
    node.owned = null;
  }
}

/**
 * Store the computed value; memos additionally propagate to observers
 * when the value actually changed
 */
function commitComputationValue(
  node: Computation<any>,
  nextValue: unknown,
  time: number,
): void {
  if (node.updatedAt && node.updatedAt > time) return;

  // If this is a memo (has observers), check if value changed and propagate
  if (node.updatedAt != null && "observers" in node) {
    propagateMemoValue(node as MemoLike, nextValue);
  } else {
    node.value = nextValue;
  }
  node.updatedAt = time;
}

/**
 * Update a memo's value and mark its observers stale (skips when the
 * comparator reports no change)
 */
function propagateMemoValue(memo: MemoLike, nextValue: unknown): void {
  if (memo.comparator?.(memo.value, nextValue)) return;

  memo.value = nextValue;
  if (!memo.observers?.length) return;

  for (let i = 0; i < memo.observers.length; i++) {
    const o = memo.observers[i]! as MemoLike;
    if (!o.state) {
      // Only pure observers can be found clean mid-propagation: memos are
      // re-resolved on demand (resolvePending) while non-pure observers
      // (effects) only drain after every pure update has settled — by then
      // markDownstream has already marked them.
      Updates?.push(o);
      if (o.observers) markDownstream(o);
    }
    o.state = STALE;
  }
}

/**
 * Clean up a computation's subscriptions (swap-and-pop for O(1))
 */
function cleanComputation(comp: Computation<any>): void {
  unsubscribeSources(comp);

  // Clean owned computations
  if (comp.owned) {
    for (let i = comp.owned.length - 1; i >= 0; i--) {
      cleanComputation(comp.owned[i] as Computation<any>);
    }
    comp.owned = null;
  }

  // Run cleanup functions
  if (comp.cleanups) {
    for (const cleanup of comp.cleanups) cleanup();
    comp.cleanups = null;
  }

  comp.state = 0;
}

/**
 * Detach a disposed computation from the reactive graph: unsubscribe from
 * every source and reset state so an already-queued run is skipped by
 * runTop. Used by owner disposal (cleanupOwner), which walks owner trees
 * whose owned entries can be computations.
 * @internal
 */
export function disposeComputation(comp: Computation<any>): void {
  unsubscribeSources(comp);
  comp.state = 0;
}

/**
 * Remove a computation from all its sources' observer lists
 * (swap-and-pop keeps every removal O(1))
 */
function unsubscribeSources(comp: Computation<any>): void {
  if (!comp.sources || !comp.sourceSlots) return;

  while (comp.sources.length) {
    const source: Signal<any> = comp.sources.pop()!;
    const index = comp.sourceSlots.pop()!;

    if (source.observers?.length && source.observerSlots) {
      const last = source.observers.pop()!;
      const lastSlot = source.observerSlots.pop()!;

      if (index < source.observers.length) {
        source.observers[index] = last;
        source.observerSlots[index] = lastSlot;
        last.sourceSlots![lastSlot] = index;
      }
    }
  }
}

/**
 * Execute function without tracking dependencies
 */
export function untrack<T>(fn: () => T): T {
  if (Listener === null) return fn();

  const prevListener = Listener;
  Listener = null;
  try {
    return fn();
  } finally {
    Listener = prevListener;
  }
}

/**
 * Batch multiple updates into one flush
 */
export function batch<T>(fn: () => T): T {
  return runUpdates(fn, false) as T;
}

/**
 * Wait for all pending updates to complete
 */
export function flushSync(): Promise<void> {
  return Promise.resolve();
}
