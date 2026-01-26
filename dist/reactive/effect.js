/**
 * createEffect - run side effects when dependencies change
 */
import { runComputation, getListener } from './tracking.js';
/**
 * Create a reactive effect that runs when dependencies change
 */
export function createEffect(fn) {
    const computation = {
        fn: () => {
            const cleanup = fn();
            if (typeof cleanup === 'function') {
                if (!computation.cleanups) {
                    computation.cleanups = [cleanup];
                }
                else {
                    computation.cleanups.push(cleanup);
                }
            }
        },
        sources: null,
        sourceSlots: null,
        state: 1, // STALE - needs initial run
        cleanups: null,
    };
    // Run immediately
    runComputation(computation);
}
/**
 * Register a cleanup function for the current computation
 */
export function onCleanup(fn) {
    const listener = getListener();
    if (listener) {
        if (!listener.cleanups) {
            listener.cleanups = [fn];
        }
        else {
            listener.cleanups.push(fn);
        }
    }
}
