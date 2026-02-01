/**
 * Context - pass values down the component tree (non-reactive)
 */

export interface Context<T> {
  id: symbol;
  defaultValue: T | undefined;
  // biome-ignore lint/suspicious/noExplicitAny: Provider accepts any JSX children and returns JSX element
  Provider: (props: { value: T; children: any }) => any;
}

// Stack of values per context ID
// biome-ignore lint/suspicious/noExplicitAny: context values can be any type
const contextStacks = new Map<symbol, any[]>();

/**
 * Create a context for passing values down the tree
 */
export function createContext<T>(defaultValue?: T): Context<T> {
  const id = Symbol('context');

  // biome-ignore lint/suspicious/noExplicitAny: Provider accepts any JSX children
  const Provider = (props: { value: T; children: any }) => {
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
export function useContext<T>(context: Context<T>): T {
  const stack = contextStacks.get(context.id);
  if (stack?.length) {
    return stack[stack.length - 1];
  }
  return context.defaultValue as T;
}

/**
 * Push a context value (called by renderer)
 * @internal
 */
export function pushContext<T>(contextId: symbol, value: T): void {
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
export function popContext(contextId: symbol): void {
  const stack = contextStacks.get(contextId);
  stack?.pop();
}

/**
 * Clear all context stacks (for testing)
 * @internal
 */
export function clearContextStacks(): void {
  contextStacks.clear();
}
