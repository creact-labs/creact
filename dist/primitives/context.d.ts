/**
 * Context - pass values down the component tree (non-reactive)
 */
export interface Context<T> {
    id: symbol;
    defaultValue: T | undefined;
    Provider: (props: {
        value: T;
        children: any;
    }) => any;
}
/**
 * Create a context for passing values down the tree
 */
export declare function createContext<T>(defaultValue?: T): Context<T>;
/**
 * Read a context value
 */
export declare function useContext<T>(context: Context<T>): T;
/**
 * Push a context value (called by renderer)
 * @internal
 */
export declare function pushContext<T>(contextId: symbol, value: T): void;
/**
 * Pop a context value (called by renderer)
 * @internal
 */
export declare function popContext(contextId: symbol): void;
/**
 * Clear all context stacks (for testing)
 * @internal
 */
export declare function clearContextStacks(): void;
