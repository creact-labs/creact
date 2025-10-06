// REQ-02: useContext hook - React-like context consumption
// This hook retrieves values from the nearest Provider in the component tree

import { Context } from '../context/createContext';
import { FiberNode } from '../core/types';
import {
  setContextRenderContext as setContextRenderContextInternal,
  clearContextRenderContext as clearContextRenderContextInternal,
  pushContextValue as pushContextValueInternal,
  popContextValue as popContextValueInternal,
  getContextRenderContext,
  getContextValue,
  clearContextStacks as clearContextStacksInternal,
} from './context';

/**
 * Set the current rendering context for useContext
 * Called by Renderer before executing a component
 *
 * @internal
 */
export function setContextRenderContext(fiber: FiberNode): void {
  setContextRenderContextInternal(fiber);
}

/**
 * Clear the current rendering context for useContext
 * Called by Renderer after component execution
 *
 * @internal
 */
export function clearContextRenderContext(): void {
  clearContextRenderContextInternal();
}

/**
 * Push a context value onto the stack
 * Called by Renderer when entering a Provider
 *
 * @internal
 */
export function pushContextValue(contextId: symbol, value: any): void {
  pushContextValueInternal(contextId, value);
}

/**
 * Pop a context value from the stack
 * Called by Renderer when exiting a Provider
 *
 * @internal
 */
export function popContextValue(contextId: symbol): void {
  popContextValueInternal(contextId);
}

/**
 * Clear all context stacks
 * Called by Renderer to prevent memory leaks
 *
 * @internal
 */
export function clearContextStacks(): void {
  clearContextStacksInternal();
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
  // Get current context from AsyncLocalStorage
  const currentFiber = getContextRenderContext();
  
  // Validate hook is called during rendering
  if (!currentFiber) {
    throw new Error(
      'useContext must be called during component rendering. ' +
        'Make sure you are calling it inside a component function, not at the top level.'
    );
  }

  // Look up the context value from the stack
  const result = getContextValue(context._contextId);

  // If Provider found, return the value (even if it's undefined)
  if (result.hasValue) {
    return result.value as T;
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
