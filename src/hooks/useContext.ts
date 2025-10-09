// REQ-02: useContext hook - React-like context consumption
// This hook retrieves values from the nearest Provider in the component tree

import { Context } from '../context/createContext';
import { FiberNode } from '../core/types';
import {
  setRenderContext as setContextRenderContextInternal,
  clearRenderContext as clearContextRenderContextInternal,
  pushContextValue as pushContextValueInternal,
  popContextValue as popContextValueInternal,
  getContextValue,
  clearContextStacks as clearContextStacksInternal,
  incrementHookIndex,
  requireHookContext,
} from './context';

// Global context dependency tracker instance
let contextDependencyTracker: any = null;

/**
 * Set the context dependency tracker instance
 * Called by CReact during initialization
 * 
 * @internal
 */
export function setContextDependencyTracker(tracker: any): void {
  contextDependencyTracker = tracker;
}

/**
 * Get the context dependency tracker instance
 * 
 * @internal
 */
export function getContextDependencyTracker(): any {
  return contextDependencyTracker;
}

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
 * Enhanced with reactive capabilities:
 * - Tracks context dependencies for selective re-rendering
 * - Only triggers re-renders when context values are bound to provider outputs
 * - Integrates with ContextDependencyTracker for change detection
 *
 * REQ-02: Stack Context (declarative outputs)
 * REQ-3.1, 3.2, 3.3, 3.4, 3.5: Context reactivity system
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
 *   return <></>;
 * }
 * ```
 */
export function useContext<T>(context: Context<T>): T {
  // Use consolidated hook context
  const hookContext = requireHookContext();
  const currentFiber = hookContext.currentFiber!; // Non-null assertion safe due to requireHookContext validation

  // Get hook index for dependency tracking (context-specific)
  const hookIndex = incrementHookIndex('context');

  // Track context dependency for reactive updates
  if (contextDependencyTracker) {
    contextDependencyTracker.trackContextConsumption(
      context._contextId,
      currentFiber,
      hookIndex
    );
  }

  // Look up the context value from the stack
  const result = getContextValue(context._contextId);

  let contextValue: T;

  // If Provider found, return the value (even if it's undefined)
  if (result.hasValue) {
    contextValue = result.value as T;
  } else if (context.defaultValue !== undefined) {
    // If no Provider found, use default value
    contextValue = context.defaultValue;
  } else {
    // No Provider and no default value - throw error
    throw new Error(
      `useContext called without a Provider for this context and no default value was provided. ` +
        `Make sure to wrap your component tree with <Context.Provider value={...}>.`
    );
  }

  // Store the context value in the dependency tracker for change detection
  if (contextDependencyTracker) {
    contextDependencyTracker.setInitialContextValue(context._contextId, contextValue);
  }

  return contextValue;
}
