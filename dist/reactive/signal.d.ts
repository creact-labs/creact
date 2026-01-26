/**
 * Signal - core reactive primitive (internal)
 * Inspired by SolidJS createSignal
 */
/**
 * Signal state - holds value and tracks observers
 */
export interface Signal<T> {
    value: T | undefined;
    observers: Computation<any>[] | null;
    observerSlots: number[] | null;
}
/**
 * Computation - tracks dependencies and re-runs when they change
 */
export interface Computation<T> {
    fn: () => T;
    sources: Signal<any>[] | null;
    sourceSlots: number[] | null;
    state: 0 | 1 | 2;
    cleanups: (() => void)[] | null;
}
export type Accessor<T> = () => T | undefined;
export type Setter<T> = (value: T) => void;
/**
 * Create a reactive signal (internal - not exported from package)
 */
export declare function createSignal<T>(initial?: T): [Accessor<T>, Setter<T>];
/**
 * Get raw signal value without tracking
 */
export declare function peekSignal<T>(signal: Signal<T>): T | undefined;
