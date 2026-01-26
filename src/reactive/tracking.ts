/**
 * Global tracking context for reactive system
 * Inspired by SolidJS signal.ts
 */

import type { Computation, Signal } from './signal.js';

// Currently executing computation (for dependency tracking)
export let Listener: Computation<any> | null = null;

// Queue of computations to run
const queue: Computation<any>[] = [];
let pending = false;

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

  if (!pending) {
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

  for (const comp of toRun) {
    if (comp.state === 1) {
      // Still STALE
      runComputation(comp);
    }
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
  if (comp.sources) {
    while (comp.sources.length) {
      const source: Signal<any> = comp.sources.pop()!;
      const index = comp.sourceSlots!.pop()!;

      // Swap-and-pop removal from source.observers
      if (source.observers?.length) {
        const last = source.observers.pop()!;
        const lastSlot = source.observerSlots!.pop()!;

        if (index < source.observers.length) {
          // Move last item to fill the hole
          source.observers[index] = last;
          source.observerSlots![index] = lastSlot;
          // Update the moved item's reference
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
 */
export function batch<T>(fn: () => T): T {
  const prevPending = pending;
  pending = true;

  try {
    return fn();
  } finally {
    pending = prevPending;
    if (!pending && queue.length) {
      flushQueue();
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
