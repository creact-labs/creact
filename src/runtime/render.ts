/**
 * Render - transform JSX to Fiber tree
 */

import { getContextSnapshot, popContext, pushContext, restoreContextSnapshot } from '../primitives/context';
import type { Computation } from '../reactive/signal';
import { cleanComputation, runComputation } from '../reactive/tracking';
import type { Fiber } from './fiber';
import { createFiber } from './fiber';

// Current render context
let currentFiber: Fiber | null = null;
let currentPath: string[] = [];
let currentHookIndex = 0;

// Resource path - only components with useInstance contribute to this
// This makes wrapper components (without useInstance) transparent
let resourcePath: string[] = [];

/**
 * Get current fiber (for hooks)
 */
export function getCurrentFiber(): Fiber | null {
  return currentFiber;
}

/**
 * Get current path (for hooks)
 */
export function getCurrentPath(): string[] {
  return [...currentPath];
}

/**
 * Get current resource path (for useInstance)
 * Only components with useInstance contribute to this path
 */
export function getCurrentResourcePath(): string[] {
  return [...resourcePath];
}

/**
 * Get next hook index and increment (for hook memoization)
 */
export function getNextHookIndex(): number {
  return currentHookIndex++;
}

/**
 * Reset hook index (called before component execution)
 */
export function resetHookIndex(): void {
  currentHookIndex = 0;
}

/**
 * Push a segment to resource path (called by useInstance)
 */
export function pushResourcePath(segment: string): void {
  resourcePath.push(segment);
}

/**
 * Pop a segment from resource path (called after component with instance renders)
 */
export function popResourcePath(): void {
  resourcePath.pop();
}

/**
 * Reset resource path (called at start of render)
 */
export function resetResourcePath(): void {
  resourcePath = [];
}

/**
 * Render a JSX element to a Fiber
 */
export function renderFiber(element: any, path: string[]): Fiber {
  // Handle null/undefined/boolean
  if (element == null || typeof element === 'boolean') {
    return createFiber(null, {}, path);
  }

  // Handle primitives (text)
  if (typeof element === 'string' || typeof element === 'number') {
    return createFiber('text', { value: element }, path);
  }

  // Handle arrays
  if (Array.isArray(element)) {
    const fiber = createFiber('fragment', {}, path);
    fiber.children = element.map((child, i) => {
      const childKey = child?.key ?? i;
      return renderFiber(child, [...path, String(childKey)]);
    });
    return fiber;
  }

  // Handle JSX element
  const { type, props = {}, key } = element;
  const { children, ...restProps } = props;

  // Generate path segment
  const name = getNodeName(type, props, key);
  const fiberPath = [...path, name];

  const fiber = createFiber(type, restProps, fiberPath, key);

  // Check if this is a context provider
  if (element.__isProvider && element.__context) {
    pushContext(element.__context, props.value);

    try {
      fiber.children = renderChildren(children, fiberPath);
    } finally {
      popContext(element.__context);
    }

    return fiber;
  }

  // Handle function components
  if (typeof type === 'function') {
    // Capture incoming resource path for reactive re-renders
    fiber.incomingResourcePath = [...resourcePath];

    // Just execute once - no computation wrapper
    // Effects inside create their own computations and track dependencies
    executeComponent(fiber, type, { ...restProps, children });
  } else {
    // Intrinsic element - just render children
    fiber.children = renderChildren(children, fiberPath);
  }

  return fiber;
}


/**
 * Execute a component function with reactive tracking
 */
// biome-ignore lint/complexity/noBannedTypes: JSX component types are dynamically resolved at runtime
function executeComponent(fiber: Fiber, type: Function, props: Record<string, any>): void {
  // Store props on fiber so computation can read updated props on re-render
  fiber.props = props;

  // Capture context snapshot NOW (while inside Provider tree) for reactive re-runs
  fiber.contextSnapshot = getContextSnapshot();

  // Create computation for reactive re-renders
  const computation: Computation<void> = {
    fn: () => {
      const prevFiber = currentFiber;
      const prevPath = currentPath;
      const prevHookIndex = currentHookIndex;

      // Restore context from snapshot (needed when computation re-runs from reactive system)
      // This ensures useContext works correctly even when not inside render tree
      if (fiber.contextSnapshot) {
        restoreContextSnapshot(fiber.contextSnapshot);
      }

      // Save current context state to restore after (for cleanup of child contexts)
      const prevContextSnapshot = getContextSnapshot();

      currentFiber = fiber;
      currentPath = fiber.path;
      currentHookIndex = 0; // Reset hook index for each render

      // Restore resource path for reactive re-renders
      resourcePath = [...(fiber.incomingResourcePath ?? [])];

      // Store old children for reconciliation
      const oldChildren = fiber.children;

      // Clean up old effects before re-executing component
      // This prevents effect accumulation on re-renders
      if (fiber.effects) {
        for (const effect of fiber.effects) {
          cleanComputation(effect);
        }
        fiber.effects = [];
      }

      // Clear instance nodes and placeholder flag before re-executing component
      fiber.instanceNodes = [];
      fiber.hasPlaceholderInstance = false;

      try {
        // Execute component - read props from fiber for updated values
        const result = type(fiber.props);

        // Render children from result with reconciliation
        fiber.children = renderChildren(result, fiber.path, oldChildren);
      } finally {
        // Clean up old children that weren't reused
        // (they're no longer in fiber.children after reconciliation)
        for (const oldChild of oldChildren) {
          if (!fiber.children.includes(oldChild)) {
            cleanupFiber(oldChild);
          }
        }

        // If this component had useInstance (real or placeholder), pop its resource path segment
        if (fiber.instanceNodes.length > 0 || fiber.hasPlaceholderInstance) {
          popResourcePath();
        }

        // Restore previous context state
        restoreContextSnapshot(prevContextSnapshot);

        currentFiber = prevFiber;
        currentPath = prevPath;
        currentHookIndex = prevHookIndex;
      }
    },
    sources: null,
    sourceSlots: null,
    state: 1, // STALE - needs initial run
    cleanups: null,
  };

  // Store computation on fiber
  fiber.computation = computation;

  // Run immediately with tracking
  runComputation(computation);
}

/**
 * Update and re-execute an existing component (for reconciliation)
 * Reuses the existing fiber and computation
 */
// biome-ignore lint/complexity/noBannedTypes: JSX component types are dynamically resolved at runtime
function executeComponentUpdate(fiber: Fiber, type: Function, props: Record<string, any>): void {
  // Update props on fiber
  fiber.props = props;

  // If fiber has a computation, run it to re-render
  if (fiber.computation) {
    runComputation(fiber.computation);
  } else {
    // Shouldn't happen, but fall back to creating new computation
    executeComponent(fiber, type, props);
  }
}

/**
 * Render children (handles various child types)
 * @param oldChildren - Previous children fibers for reconciliation
 */
function renderChildren(children: any, parentPath: string[], oldChildren: Fiber[] = []): Fiber[] {
  if (children == null || typeof children === 'boolean') {
    return [];
  }

  // Build a map of old fibers by key for O(1) lookup
  const oldFibersByKey = new Map<string, Fiber>();
  for (const oldFiber of oldChildren) {
    const key = oldFiber.key !== undefined ? String(oldFiber.key) : (oldFiber.path[oldFiber.path.length - 1] ?? '');
    if (key) oldFibersByKey.set(key, oldFiber);
  }

  if (Array.isArray(children)) {
    return children.flatMap((child, i) => {
      const childKey = child?.key ?? i;
      const fiber = renderFiberWithReconciliation(child, [...parentPath, String(childKey)], oldFibersByKey);
      return fiber.type === null ? [] : [fiber];
    });
  }

  const fiber = renderFiberWithReconciliation(children, parentPath, oldFibersByKey);
  return fiber.type === null ? [] : [fiber];
}

/**
 * Render a fiber with reconciliation against old fibers
 * Reuses existing fiber if key/type match to preserve computation references
 */
function renderFiberWithReconciliation(element: any, path: string[], oldFibersByKey: Map<string, Fiber>): Fiber {
  // Handle null/undefined/boolean
  if (element == null || typeof element === 'boolean') {
    return createFiber(null, {}, path);
  }

  // Handle primitives (text)
  if (typeof element === 'string' || typeof element === 'number') {
    return createFiber('text', { value: element }, path);
  }

  // Handle arrays - no reconciliation for fragments
  if (Array.isArray(element)) {
    const fiber = createFiber('fragment', {}, path);
    fiber.children = element.map((child, i) => {
      const childKey = child?.key ?? i;
      return renderFiber(child, [...path, String(childKey)]);
    });
    return fiber;
  }

  // Handle JSX element
  const { type, props = {}, key } = element;
  const { children, ...restProps } = props;

  // Generate path segment
  const name = getNodeName(type, props, key);
  const fiberPath = [...path, name];

  // Handle context providers - must push/pop context even during reconciliation
  if (element.__isProvider && element.__context) {
    const lookupKey = key !== undefined ? String(key) : name;
    const oldFiber = oldFibersByKey.get(lookupKey);
    const fiber = oldFiber ?? createFiber(type, restProps, fiberPath, key);

    pushContext(element.__context, props.value);

    try {
      fiber.children = renderChildren(children, fiberPath, oldFiber?.children ?? []);
    } finally {
      popContext(element.__context);
    }

    return fiber;
  }

  // Try to find matching old fiber by key
  const lookupKey = key !== undefined ? String(key) : name;
  const oldFiber = oldFibersByKey.get(lookupKey);

  // Check if we can reuse the old fiber (same type)
  if (oldFiber && oldFiber.type === type) {
    // Reuse old fiber - update props and re-execute
    oldFiber.props = restProps;

    if (typeof type === 'function') {
      // Re-execute component with updated props
      executeComponentUpdate(oldFiber, type, { ...restProps, children });
    } else {
      // Intrinsic element - just re-render children
      oldFiber.children = renderChildren(children, fiberPath, oldFiber.children);
    }

    return oldFiber;
  }

  // No matching old fiber - create new one
  return renderFiber(element, path);
}

/**
 * Get node name from type and props
 */
function getNodeName(type: any, _props: Record<string, any>, key?: string | number): string {
  if (key !== undefined) {
    return String(key);
  }

  if (typeof type === 'string') {
    return type;
  }

  if (typeof type === 'function') {
    return type.name || 'Component';
  }

  return 'unknown';
}

/**
 * Collect all instance nodes from fiber tree
 * Returns cloned nodes to ensure returned arrays are independent snapshots
 */
export function collectInstanceNodes(fiber: Fiber): any[] {
  const nodes: any[] = [];

  function walk(f: Fiber): void {
    for (const instanceNode of f.instanceNodes) {
      // Clone the node to create an independent snapshot
      // (outputSignals are not cloned - they're internal reactive state)
      const snapshot = {
        ...instanceNode,
        // Deep clone the store so it's independent between runs
        store: f.store ? JSON.parse(JSON.stringify(f.store)) : undefined,
      };
      nodes.push(snapshot);
    }
    for (const child of f.children) {
      walk(child);
    }
  }

  walk(fiber);
  return nodes;
}

/**
 * Clean up a fiber tree
 */
export function cleanupFiber(fiber: Fiber): void {
  // Clean up the fiber's computation
  if (fiber.computation) {
    cleanComputation(fiber.computation);
  }

  // Clean up any effects created by this fiber
  if (fiber.effects) {
    for (const effect of fiber.effects) {
      cleanComputation(effect);
    }
    fiber.effects = [];
  }

  // Recursively clean up children
  for (const child of fiber.children) {
    cleanupFiber(child);
  }
}
