/**
 * Global tracking context for reactive system
 * Inspired by SolidJS signal.ts
 */
import type { Computation } from './signal.js';
export declare let Listener: Computation<any> | null;
/**
 * Set the current listener (computation being executed)
 */
export declare function setListener(comp: Computation<any> | null): Computation<any> | null;
/**
 * Get current listener
 */
export declare function getListener(): Computation<any> | null;
/**
 * Schedule a computation to run
 */
export declare function scheduleComputation(comp: Computation<any>): void;
/**
 * Run a computation with tracking
 */
export declare function runComputation(comp: Computation<any>): void;
/**
 * Clean up a computation's subscriptions (swap-and-pop for O(1))
 */
export declare function cleanComputation(comp: Computation<any>): void;
/**
 * Execute function without tracking dependencies
 */
export declare function untrack<T>(fn: () => T): T;
/**
 * Batch multiple updates into one flush
 */
export declare function batch<T>(fn: () => T): T;
/**
 * Wait for all pending updates to complete
 */
export declare function flushSync(): Promise<void>;
