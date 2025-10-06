// Hook context management using AsyncLocalStorage for thread safety
// This ensures hook state is isolated per execution context in concurrent deployments

import { AsyncLocalStorage } from 'async_hooks';
import { FiberNode } from '../core/types';

/**
 * Hook execution context - contains all state needed for hooks
 */
interface HookContext {
  // useState context
  currentFiber: any | null;
  hookIndex: number;
  
  // useContext context
  contextFiber: FiberNode | null;
  contextStacks: Map<symbol, any[]>;
  
  // useInstance context
  instanceFiber: any | null;
  currentPath: string[];
  previousOutputsMap: Map<string, Record<string, any>> | null;
}

/**
 * AsyncLocalStorage instance for hook context isolation
 */
const hookContextStorage = new AsyncLocalStorage<HookContext>();

/**
 * Create a new hook context
 */
function createHookContext(): HookContext {
  return {
    // useState context
    currentFiber: null,
    hookIndex: 0,
    
    // useContext context
    contextFiber: null,
    contextStacks: new Map<symbol, any[]>(),
    
    // useInstance context
    instanceFiber: null,
    currentPath: [],
    previousOutputsMap: null,
  };
}

/**
 * Get the current hook context, throwing if not available
 */
function getHookContext(): HookContext {
  const context = hookContextStorage.getStore();
  if (!context) {
    throw new Error('Hook called outside of rendering context. This is likely a bug in CReact.');
  }
  return context;
}

/**
 * Get the current hook context, returning null if not available
 */
function getHookContextSafe(): HookContext | null {
  return hookContextStorage.getStore() || null;
}

/**
 * Run a function with a new hook context
 */
export function runWithHookContext<T>(fn: () => T): T {
  const context = createHookContext();
  return hookContextStorage.run(context, fn);
}

// useState context management
export function setStateRenderContext(fiber: any): void {
  const context = getHookContextSafe();
  if (context) {
    context.currentFiber = fiber;
    context.hookIndex = 0; // Reset hook index for new component
  }
}

export function clearStateRenderContext(): void {
  const context = getHookContextSafe();
  if (context) {
    context.currentFiber = null;
    context.hookIndex = 0;
  }
}

export function getStateContext(): { currentFiber: any | null; hookIndex: number } {
  const context = getHookContextSafe();
  if (!context) {
    throw new Error('Hook called outside of rendering context. This is likely a bug in CReact.');
  }
  return {
    currentFiber: context.currentFiber,
    hookIndex: context.hookIndex,
  };
}

export function incrementHookIndex(): number {
  const context = getHookContextSafe();
  if (!context) {
    throw new Error('Hook called outside of rendering context. This is likely a bug in CReact.');
  }
  const currentIndex = context.hookIndex;
  context.hookIndex++;
  return currentIndex;
}

export function hasStateContext(): boolean {
  const context = getHookContextSafe();
  return context?.currentFiber !== null;
}

export function getCurrentState(): Record<string, any> | undefined {
  const context = getHookContextSafe();
  return context?.currentFiber?.state;
}

// useContext context management
export function setContextRenderContext(fiber: FiberNode): void {
  const context = getHookContextSafe();
  if (context) {
    context.contextFiber = fiber;
  }
}

export function clearContextRenderContext(): void {
  const context = getHookContextSafe();
  if (context) {
    context.contextFiber = null;
  }
}

export function getContextRenderContext(): FiberNode | null {
  const context = getHookContextSafe();
  if (!context) {
    throw new Error('Hook called outside of rendering context. This is likely a bug in CReact.');
  }
  return context.contextFiber;
}

export function pushContextValue(contextId: symbol, value: any): void {
  const context = getHookContextSafe();
  if (context) {
    if (!context.contextStacks.has(contextId)) {
      context.contextStacks.set(contextId, []);
    }
    context.contextStacks.get(contextId)!.push(value);
  }
}

export function popContextValue(contextId: symbol): void {
  const context = getHookContextSafe();
  if (context) {
    const stack = context.contextStacks.get(contextId);
    if (stack && stack.length > 0) {
      stack.pop();
    }
  }
}

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

export function clearContextStacks(): void {
  const context = getHookContextSafe();
  if (context) {
    context.contextStacks.clear();
  }
}

// useInstance context management
export function setInstanceRenderContext(fiber: any, path: string[]): void {
  const context = getHookContextSafe();
  if (context) {
    context.instanceFiber = fiber;
    context.currentPath = path;
  }
}

export function clearInstanceRenderContext(): void {
  const context = getHookContextSafe();
  if (context) {
    context.instanceFiber = null;
    context.currentPath = [];
  }
}

export function getInstanceContext(): {
  currentFiber: any | null;
  currentPath: string[];
  previousOutputsMap: Map<string, Record<string, any>> | null;
} {
  const context = getHookContextSafe();
  if (!context) {
    throw new Error('Hook called outside of rendering context. This is likely a bug in CReact.');
  }
  return {
    currentFiber: context.instanceFiber,
    currentPath: context.currentPath,
    previousOutputsMap: context.previousOutputsMap,
  };
}

export function setPreviousOutputs(outputsMap: Map<string, Record<string, any>> | null): void {
  const context = getHookContextSafe();
  if (context) {
    context.previousOutputsMap = outputsMap;
  }
}

export function getCurrentPath(): string[] {
  const context = getHookContextSafe();
  if (!context) {
    throw new Error('Hook called outside of rendering context. This is likely a bug in CReact.');
  }
  return [...context.currentPath];
}

export function isRendering(): boolean {
  const context = getHookContextSafe();
  return context?.instanceFiber !== null;
}