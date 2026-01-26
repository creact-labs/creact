/**
 * Store - persistent state (non-reactive)
 */
export type SetStoreFunction<T> = {
    <K extends keyof T>(key: K, value: T[K] | ((prev: T[K]) => T[K])): void;
    <K1 extends keyof T, K2 extends keyof T[K1]>(k1: K1, k2: K2, value: T[K1][K2] | ((prev: T[K1][K2]) => T[K1][K2])): void;
    (...args: any[]): void;
};
/**
 * Create a persistent store (non-reactive)
 */
export declare function createStore<T extends object>(initial: T): [T, SetStoreFunction<T>];
/**
 * Prepare hydration from previous nodes
 * @internal
 */
export declare function prepareHydration(previousNodes: any[]): void;
/**
 * Clear hydration map (for testing)
 * @internal
 */
export declare function clearHydration(): void;
