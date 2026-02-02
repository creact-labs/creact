/**
 * Global tracking context for reactive system
 * Inspired by SolidJS signal.ts
 */

import type { Computation, Signal } from './signal';

// Currently executing computation (for dependency tracking)
export let Listener: Computation<any> | null = null;

// Queue of computations to run
const queue: Computation<any>[] = [];
let pending = false;

// Batch depth counter for synchronous batching
let batchDepth = 0;

// Callback for when computations are flushed (for runtime integration)
let onFlushCallback: (() => void) | null = null;

/**
 * Set callback to be called after computations are flushed
 * Used by runtime to re-collect nodes after reactive updates
 */
export function setOnFlushCallback(callback: (() => void) | null): void {
  onFlushCallback = callback;
}

/**
 * Set the current listener (computation being executed)
 */
export function setListener(comp: Computation<any> | null): Computation<any> | null {
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
 * Schedule a computation to run
 */
export function scheduleComputation(comp: Computation<any>): void {
  queue.push(comp);

  // Only trigger async flush if NOT in a batch
  // When inside a batch, computations are flushed synchronously at batch end
  if (batchDepth === 0 && !pending) {
    pending = true;
    queueMicrotask(flushQueue);
  }
}

/**
 * Flush all pending computations
 */
function flushQueue(): void {
  pending = false;
  const toRun = [...queue];
  queue.length = 0;

  let didRun = false;
  for (const comp of toRun) {
    if (comp.state === 1) {
      // Still STALE
      runComputation(comp);
      didRun = true;
    }
  }

  // Notify runtime that computations were flushed
  if (didRun && onFlushCallback) {
    onFlushCallback();
  }
}

/**
 * Run a computation with tracking
 */
export function runComputation(comp: Computation<any>): void {
  // 1. Clean up old subscriptions
  cleanComputation(comp);

  // 2. Set as current listener
  const prevListener = Listener;
  Listener = comp;

  try {
    // 3. Execute - any signal reads will register
    comp.fn();
    comp.state = 0; // CLEAN
  } finally {
    Listener = prevListener;
  }
}

/**
 * Clean up a computation's subscriptions (swap-and-pop for O(1))
 */
export function cleanComputation(comp: Computation<any>): void {
  // Remove from all sources' observer lists
  if (comp.sources && comp.sourceSlots) {
    while (comp.sources.length) {
      // biome-ignore lint/style/noNonNullAssertion: length check guarantees pop() returns value
      const source: Signal<any> = comp.sources.pop()!;
      // biome-ignore lint/style/noNonNullAssertion: length check guarantees pop() returns value
      const index = comp.sourceSlots.pop()!;

      // Swap-and-pop removal from source.observers
      if (source.observers?.length && source.observerSlots) {
        // biome-ignore lint/style/noNonNullAssertion: length check guarantees pop() returns value
        const last = source.observers.pop()!;
        // biome-ignore lint/style/noNonNullAssertion: length check guarantees pop() returns value
        const lastSlot = source.observerSlots.pop()!;

        if (index < source.observers.length) {
          // Move last item to fill the hole
          source.observers[index] = last;
          // biome-ignore lint/style/noNonNullAssertion: observerSlots exists when observers exists
          source.observerSlots![index] = lastSlot;
          // Update the moved item's reference
          // biome-ignore lint/style/noNonNullAssertion: sourceSlots exists for active computations
          last.sourceSlots![lastSlot] = index;
        }
      }
    }
  }

  // Run cleanup functions
  if (comp.cleanups) {
    for (const cleanup of comp.cleanups) cleanup();
    comp.cleanups = null;
  }
}

/**
 * Execute function without tracking dependencies
 */
export function untrack<T>(fn: () => T): T {
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
 *
 * Uses synchronous batching - all dependent re-renders happen
 * immediately when the outermost batch completes.
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;

  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      // Flush synchronously - all updates happen NOW
      let didRun = false;
      while (queue.length) {
        // biome-ignore lint/style/noNonNullAssertion: length check guarantees shift() returns value
        const comp = queue.shift()!;
        if (comp.state === 1) {
          // Still STALE
          runComputation(comp);
          didRun = true;
        }
      }
      // Clear pending flag since we just flushed
      pending = false;

      // Notify runtime that computations were flushed
      // This allows new nodes created during batch to be collected and applied
      if (didRun && onFlushCallback) {
        onFlushCallback();
      }
    }
  }
}

/**
 * Wait for all pending updates to complete
 */
export function flushSync(): Promise<void> {
  return new Promise((resolve) => {
    if (!pending && queue.length === 0) {
      resolve();
    } else {
      queueMicrotask(() => {
        flushSync().then(resolve);
      });
    }
  });
}
