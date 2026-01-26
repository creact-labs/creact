/**
 * Context - pass values down the component tree (non-reactive)
 */
// Stack of values per context ID
const contextStacks = new Map();
/**
 * Create a context for passing values down the tree
 */
export function createContext(defaultValue) {
    const id = Symbol('context');
    const Provider = (props) => {
        return {
            type: Provider,
            props,
            __context: id,
            __isProvider: true,
        };
    };
    return {
        id,
        defaultValue,
        Provider,
    };
}
/**
 * Read a context value
 */
export function useContext(context) {
    const stack = contextStacks.get(context.id);
    if (stack?.length) {
        return stack[stack.length - 1];
    }
    return context.defaultValue;
}
/**
 * Push a context value (called by renderer)
 * @internal
 */
export function pushContext(contextId, value) {
    let stack = contextStacks.get(contextId);
    if (!stack) {
        stack = [];
        contextStacks.set(contextId, stack);
    }
    stack.push(value);
}
/**
 * Pop a context value (called by renderer)
 * @internal
 */
export function popContext(contextId) {
    const stack = contextStacks.get(contextId);
    stack?.pop();
}
/**
 * Clear all context stacks (for testing)
 * @internal
 */
export function clearContextStacks() {
    contextStacks.clear();
}
