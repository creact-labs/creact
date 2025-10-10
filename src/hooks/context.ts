
/**

 * Licensed under the Apache License, Version 2.0 (the "License");

 * you may not use this file except in compliance with the License.

 * You may obtain a copy of the License at

 *

 *     http://www.apache.org/licenses/LICENSE-2.0

 *

 * Unless required by applicable law or agreed to in writing, software

 * distributed under the License is distributed on an "AS IS" BASIS,

 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

 * See the License for the specific language governing permissions and

 * limitations under the License.

 *

 * Copyright 2025 Daniel Coutinho Ribeiro

 */

// Hook context management using AsyncLocalStorage for thread safety
// This ensures hook state is isolated per execution context in concurrent deployments

import { AsyncLocalStorage } from 'async_hooks';
import { FiberNode } from '../core/types';

/**
 * Access tracking session for output dependency analysis
 */
interface AccessTrackingSession {
  fiber: FiberNode;
  startTime: number;
  trackedOutputs: Set<string>;
  isActive: boolean;
}

/**
 * Consolidated Hook Context - Single source of truth for all hook state
 * Addresses Issue #9: Hook Context Consolidation
 */
interface ConsolidatedHookContext {
  // Single context for all hooks - unified fiber reference
  currentFiber: FiberNode | null;

  // Separate indices per hook type to avoid conflicts
  stateHookIndex: number;
  effectHookIndex: number;
  contextHookIndex: number;
  instanceHookIndex: number;

  // Context stacks for useContext
  contextStacks: Map<symbol, any[]>;

  // useInstance specific context
  currentPath: string[];
  previousOutputsMap: Map<string, Record<string, any>> | null;

  // Access tracking for output dependency analysis
  accessTrackingSessions: Map<FiberNode, AccessTrackingSession>;
}

/**
 * AsyncLocalStorage instance for hook context isolation
 */
const hookContextStorage = new AsyncLocalStorage<ConsolidatedHookContext>();

/**
 * Module-level previousOutputsMap that persists across context creations
 * This is necessary because runWithHookContext creates fresh contexts,
 * but we need to preserve outputs set by setPreviousOutputs() for re-renders
 */
let globalPreviousOutputsMap: Map<string, Record<string, any>> | null = null;

/**
 * Create a new consolidated hook context
 */
function createConsolidatedHookContext(): ConsolidatedHookContext {
  return {
    // Single fiber reference for all hooks
    currentFiber: null,

    // Separate indices per hook type
    stateHookIndex: 0,
    effectHookIndex: 0,
    contextHookIndex: 0,
    instanceHookIndex: 0,

    // Context stacks
    contextStacks: new Map<symbol, any[]>(),

    // useInstance context
    currentPath: [],
    previousOutputsMap: globalPreviousOutputsMap, // Use global map

    // Access tracking
    accessTrackingSessions: new Map<FiberNode, AccessTrackingSession>(),
  };
}

/**
 * Get the consolidated hook context with validation
 * This is the primary function all hooks should use
 */
export function requireHookContext(): ConsolidatedHookContext {
  const context = hookContextStorage.getStore();
  if (!context) {
    throw new Error(
      'Hook called outside of rendering context. ' +
        'Hooks must be called inside component functions during render.'
    );
  }
  if (!context.currentFiber) {
    throw new Error(
      'Hook called without active fiber context. ' +
        'This indicates a timing issue in the rendering pipeline.'
    );
  }
  return context;
}

/**
 * Get the current hook context, returning null if not available
 */
function getHookContextSafe(): ConsolidatedHookContext | null {
  return hookContextStorage.getStore() || null;
}

/**
 * Run a function with a new consolidated hook context
 */
export function runWithHookContext<T>(fn: () => T): T {
  const context = createConsolidatedHookContext();
  return hookContextStorage.run(context, fn);
}

/**
 * Increment hook index for specific hook type
 */
export function incrementHookIndex(
  hookType: 'state' | 'effect' | 'context' | 'instance' = 'state'
): number {
  const context = requireHookContext();

  switch (hookType) {
    case 'state':
      const stateIndex = context.stateHookIndex;
      context.stateHookIndex++;
      return stateIndex;
    case 'effect':
      const effectIndex = context.effectHookIndex;
      context.effectHookIndex++;
      return effectIndex;
    case 'context':
      const contextIndex = context.contextHookIndex;
      context.contextHookIndex++;
      return contextIndex;
    case 'instance':
      const instanceIndex = context.instanceHookIndex;
      context.instanceHookIndex++;
      return instanceIndex;
    default:
      throw new Error(`Unknown hook type: ${hookType}`);
  }
}

// ============================================================================
// Render Context Management
// ============================================================================

/**
 * Set the current rendering context for all hooks
 * Called by Renderer before executing a component
 *
 * Requirements: 8.2, 8.4
 */
export function setRenderContext(fiber: FiberNode, path?: string[]): void {
  const context = getHookContextSafe();
  if (context) {
    context.currentFiber = fiber;
    context.currentPath = path || [];
    context.stateHookIndex = 0;
    context.effectHookIndex = 0;
    context.contextHookIndex = 0;
    context.instanceHookIndex = 0;
  }
}

/**
 * Clear the current rendering context for all hooks
 * Called by Renderer after component execution
 *
 * Requirements: 8.2, 8.4
 */
export function clearRenderContext(): void {
  const context = getHookContextSafe();
  if (context) {
    context.currentFiber = null;
    context.stateHookIndex = 0;
    context.effectHookIndex = 0;
    context.contextHookIndex = 0;
    context.instanceHookIndex = 0;
  }
}

/**
 * Check if there is an active render context
 */
export function hasRenderContext(): boolean {
  const context = getHookContextSafe();
  return context?.currentFiber !== null;
}

/**
 * Get the current fiber state
 */
export function getCurrentState(): Record<string, any> | undefined {
  const context = getHookContextSafe();
  return context?.currentFiber?.state;
}

// ============================================================================
// useContext Support Functions
// ============================================================================

/**
 * Push a context value onto the stack
 * Called by Renderer when entering a Provider
 */
export function pushContextValue(contextId: symbol, value: any): void {
  const context = getHookContextSafe();
  if (context) {
    if (!context.contextStacks.has(contextId)) {
      context.contextStacks.set(contextId, []);
    }
    context.contextStacks.get(contextId)!.push(value);
  }
}

/**
 * Pop a context value from the stack
 * Called by Renderer when exiting a Provider
 */
export function popContextValue(contextId: symbol): void {
  const context = getHookContextSafe();
  if (context) {
    const stack = context.contextStacks.get(contextId);
    if (stack && stack.length > 0) {
      stack.pop();
    }
  }
}

/**
 * Get the current context value from the stack
 */
export function getContextValue(contextId: symbol): { hasValue: boolean; value: any } {
  const context = getHookContextSafe();
  if (!context) {
    throw new Error('Hook called outside of rendering context. This is likely a bug in CReact.');
  }
  const stack = context.contextStacks.get(contextId);
  if (stack && stack.length > 0) {
    return { hasValue: true, value: stack[stack.length - 1] };
  }
  return { hasValue: false, value: undefined };
}

/**
 * Clear all context stacks
 * Called by Renderer to prevent memory leaks
 */
export function clearContextStacks(): void {
  const context = getHookContextSafe();
  if (context) {
    context.contextStacks.clear();
  }
}

/**
 * Clear the global previous outputs map
 * Called for test isolation and cleanup
 */
export function clearPreviousOutputs(): void {
  globalPreviousOutputsMap = null;
  const context = getHookContextSafe();
  if (context) {
    context.previousOutputsMap = null;
  }
}

// ============================================================================
// useInstance Support Functions
// ============================================================================

/**
 * Set previous outputs map for restoration during render
 * Called by CReact before rendering
 */
export function setPreviousOutputs(outputsMap: Map<string, Record<string, any>> | null): void {
  // Set the global map so it persists across context creations
  globalPreviousOutputsMap = outputsMap;

  // Also update current context if available
  const context = getHookContextSafe();
  if (context) {
    context.previousOutputsMap = outputsMap;
  }
}

/**
 * Get the current rendering path
 */
export function getCurrentPath(): string[] {
  const context = getHookContextSafe();
  if (!context) {
    throw new Error('Hook called outside of rendering context. This is likely a bug in CReact.');
  }
  return [...context.currentPath];
}

/**
 * Check if currently rendering
 */
export function isRendering(): boolean {
  const context = getHookContextSafe();
  return context?.currentFiber !== null;
}

// ============================================================================
// Access Tracking for Output Dependency Analysis
// ============================================================================

/**
 * Start tracking output accesses for a fiber
 * Used by useEffect to track which outputs are accessed in dependencies
 */
export function startAccessTracking(fiber: FiberNode): void {
  const context = requireHookContext();
  context.accessTrackingSessions.set(fiber, {
    fiber,
    startTime: Date.now(),
    trackedOutputs: new Set(),
    isActive: true,
  });
}

/**
 * End tracking and return the set of accessed outputs
 */
export function endAccessTracking(fiber: FiberNode): Set<string> {
  const context = requireHookContext();
  const session = context.accessTrackingSessions.get(fiber);

  if (!session) {
    return new Set();
  }

  session.isActive = false;
  context.accessTrackingSessions.delete(fiber);

  return session.trackedOutputs;
}

/**
 * Track an output access during an active tracking session
 */
export function trackOutputAccess(fiber: FiberNode, bindingKey: string): void {
  const context = getHookContextSafe();
  if (!context) return;

  const session = context.accessTrackingSessions.get(fiber);
  if (session?.isActive) {
    session.trackedOutputs.add(bindingKey);
  }
}

/**
 * Get the current access tracking session for a fiber
 */
export function getAccessTrackingSession(fiber: FiberNode): AccessTrackingSession | undefined {
  const context = getHookContextSafe();
  return context?.accessTrackingSessions.get(fiber);
}
