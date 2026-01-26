/**
 * Global tracking context for reactive system
 * Inspired by SolidJS signal.ts
 */
// Currently executing computation (for dependency tracking)
export let Listener = null;
// Queue of computations to run
const queue = [];
let pending = false;
/**
 * Set the current listener (computation being executed)
 */
export function setListener(comp) {
    const prev = Listener;
    Listener = comp;
    return prev;
}
/**
 * Get current listener
 */
export function getListener() {
    return Listener;
}
/**
 * Schedule a computation to run
 */
export function scheduleComputation(comp) {
    queue.push(comp);
    if (!pending) {
        pending = true;
        queueMicrotask(flushQueue);
    }
}
/**
 * Flush all pending computations
 */
function flushQueue() {
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
export function runComputation(comp) {
    // 1. Clean up old subscriptions
    cleanComputation(comp);
    // 2. Set as current listener
    const prevListener = Listener;
    Listener = comp;
    try {
        // 3. Execute - any signal reads will register
        comp.fn();
        comp.state = 0; // CLEAN
    }
    finally {
        Listener = prevListener;
    }
}
/**
 * Clean up a computation's subscriptions (swap-and-pop for O(1))
 */
export function cleanComputation(comp) {
    // Remove from all sources' observer lists
    if (comp.sources) {
        while (comp.sources.length) {
            const source = comp.sources.pop();
            const index = comp.sourceSlots.pop();
            // Swap-and-pop removal from source.observers
            if (source.observers?.length) {
                const last = source.observers.pop();
                const lastSlot = source.observerSlots.pop();
                if (index < source.observers.length) {
                    // Move last item to fill the hole
                    source.observers[index] = last;
                    source.observerSlots[index] = lastSlot;
                    // Update the moved item's reference
                    last.sourceSlots[lastSlot] = index;
                }
            }
        }
    }
    // Run cleanup functions
    if (comp.cleanups) {
        for (const cleanup of comp.cleanups)
            cleanup();
        comp.cleanups = null;
    }
}
/**
 * Execute function without tracking dependencies
 */
export function untrack(fn) {
    const prevListener = Listener;
    Listener = null;
    try {
        return fn();
    }
    finally {
        Listener = prevListener;
    }
}
/**
 * Batch multiple updates into one flush
 */
export function batch(fn) {
    const prevPending = pending;
    pending = true;
    try {
        return fn();
    }
    finally {
        pending = prevPending;
        if (!pending && queue.length) {
            flushQueue();
        }
    }
}
/**
 * Wait for all pending updates to complete
 */
export function flushSync() {
    return new Promise((resolve) => {
        if (!pending && queue.length === 0) {
            resolve();
        }
        else {
            queueMicrotask(() => {
                flushSync().then(resolve);
            });
        }
    });
}
