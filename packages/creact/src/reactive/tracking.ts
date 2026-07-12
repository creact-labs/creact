/**
 * Global tracking context for reactive system
 */

import { setOwner } from "./current-owner";
import type { Computation, Signal } from "./signal";

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
let handleErrorFn: ((err: unknown, owner: any) => void) | null = null;

/**
 * Register the error handler (called from signal.ts at module init)
 * @internal
 */
export function registerHandleError(
  fn: (err: unknown, owner: any) => void,
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
 * Run effects queue
 */
function runEffects(queue: Computation<any>[]): void {
  for (let i = 0; i < queue.length; i++) {
    runTop(queue[i]!);
    if (i > 10e5) {
      queue.length = 0;
      throw new Error("Potential infinite loop detected.");
    }
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

  const ancestors: Computation<any>[] = [node];
  while (
    (node = node.owner as Computation<any>) &&
    (!node.updatedAt || node.updatedAt < ExecCount)
  ) {
    if (node.state) ancestors.push(node);
  }

  for (let i = ancestors.length - 1; i >= 0; i--) {
    node = ancestors[i]!;
    if (node.state === STALE) {
      updateComputation(node);
    } else if (node.state === PENDING) {
      const updates = Updates;
      Updates = null;
      runUpdates(() => lookUpstream(node, ancestors[0]), false);
      Updates = updates;
    }
  }
}

/**
 * Look upstream for stale sources
 */
function lookUpstream(node: Computation<any>, ignore?: Computation<any>): void {
  node.state = 0;
  if (!node.sources) return;

  for (let i = 0; i < node.sources.length; i++) {
    const source = node.sources[i] as any;
    if (source.sources) {
      const state = source.state;
      if (state === STALE) {
        if (
          source !== ignore &&
          (!source.updatedAt || source.updatedAt < ExecCount)
        ) {
          runTop(source);
        }
      } else if (state === PENDING) {
        lookUpstream(source, ignore);
      }
    }
  }
}

/**
 * Mark downstream observers as pending
 */
export function markDownstream(node: any): void {
  if (!node.observers) return;

  for (let i = 0; i < node.observers.length; i++) {
    const o = node.observers[i]!;
    if (!o.state) {
      o.state = PENDING;
      if (o.pure) Updates?.push(o);
      else Effects?.push(o);
      if (o.observers) markDownstream(o);
    }
  }
}

/**
 * Update a computation - clean it and run it
 */
export function updateComputation(node: Computation<any>): void {
  if (!node.fn) return;
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
  value: any,
  time: number,
): void {
  let nextValue: any;
  const prevListener = Listener;
  const prevOwner = setOwner(node as any);
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
  nextValue: any,
  time: number,
): void {
  if (node.updatedAt && node.updatedAt > time) return;

  // If this is a memo (has observers), check if value changed and propagate
  if (node.updatedAt != null && "observers" in node) {
    propagateMemoValue(node as any, nextValue);
  } else {
    node.value = nextValue;
  }
  node.updatedAt = time;
}

/**
 * Update a memo's value and mark its observers stale (skips when the
 * comparator reports no change)
 */
function propagateMemoValue(memo: any, nextValue: any): void {
  if (memo.comparator?.(memo.value, nextValue)) return;

  memo.value = nextValue;
  if (!memo.observers?.length) return;

  for (let i = 0; i < memo.observers.length; i++) {
    const o = memo.observers[i]!;
    if (!o.state) {
      if (o.pure) Updates?.push(o);
      else Effects?.push(o);
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
