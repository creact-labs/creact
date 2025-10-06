// REQ-02: useContext hook - React-like context consumption
// This hook retrieves values from the nearest Provider in the component tree

import { Context } from '../context/createContext';
import { FiberNode } from '../core/types';

/**
 * Current rendering context for useContext
 * This is set by the Renderer during component execution
 */
let currentFiber: FiberNode | null = null;

/**
 * Context stack - maps context ID to stack of values
 * The Renderer pushes/pops values as it enters/exits Providers
 */
const contextStacks = new Map<symbol, any[]>();

/**
 * Set the current rendering context for useContext
 * Called by Renderer before executing a component
 * 
 * @internal
 */
export function setContextRenderContext(fiber: FiberNode): void {
  currentFiber = fiber;
}

/**
 * Clear the current rendering context for useContext
 * Called by Renderer after component execution
 * 
 * @internal
 */
export function clearContextRenderContext(): void {
  currentFiber = null;
}

/**
 * Push a context value onto the stack
 * Called by Renderer when entering a Provider
 * 
 * @internal
 */
export function pushContextValue(contextId: symbol, value: any): void {
  if (!contextStacks.has(contextId)) {
    contextStacks.set(contextId, []);
  }
  contextStacks.get(contextId)!.push(value);
}

/**
 * Pop a context value from the stack
 * Called by Renderer when exiting a Provider
 * 
 * @internal
 */
export function popContextValue(contextId: symbol): void {
  const stack = contextStacks.get(contextId);
  if (stack && stack.length > 0) {
    stack.pop();
  }
}

/**
 * useContext hook - Retrieve value from nearest Provider (like React.useContext)
 * 
 * This hook retrieves the value from the nearest Provider in the component tree.
 * The Renderer maintains a stack of context values as it traverses the tree.
 * 
 * REQ-02: Stack Context (declarative outputs)
 * 
 * @param context - Context object created by createContext
 * @returns Value from nearest Provider, or default value if no Provider found
 * @throws Error if no Provider found and no default value provided
 * 
 * @example
 * ```tsx
 * const RegistryContext = createContext<{ repositoryUrl?: string }>({});
 * 
 * function Service() {
 *   const { repositoryUrl } = useContext(RegistryContext);
 *   
 *   const service = useInstance(AppRunnerService, {
 *     image: `${repositoryUrl}:latest`
 *   });
 *   
 *   return null;
 * }
 * ```
 */
export function useContext<T>(context: Context<T>): T {
  // Validate hook is called during rendering
  if (!currentFiber) {
    throw new Error(
      'useContext must be called during component rendering. ' +
      'Make sure you are calling it inside a component function, not at the top level.'
    );
  }
  
  // Look up the context value from the stack
  const stack = contextStacks.get(context._contextId);
  
  // If Provider found, return the top value from the stack (nearest Provider)
  if (stack && stack.length > 0) {
    return stack[stack.length - 1] as T;
  }
  
  // If no Provider found, use default value
  if (context.defaultValue !== undefined) {
    return context.defaultValue;
  }
  
  // No Provider and no default value - throw error
  throw new Error(
    `useContext called without a Provider for this context and no default value was provided. ` +
    `Make sure to wrap your component tree with <Context.Provider value={...}>.`
  );
}
