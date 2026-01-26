/**
 * createEffect - run side effects when dependencies change
 */
/**
 * Create a reactive effect that runs when dependencies change
 */
export declare function createEffect(fn: () => void | (() => void)): void;
/**
 * Register a cleanup function for the current computation
 */
export declare function onCleanup(fn: () => void): void;
