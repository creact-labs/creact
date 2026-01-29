/**
 * Render - transform JSX to Fiber tree
 */

import type { Fiber } from './fiber.js';
import { createFiber } from './fiber.js';
import { runComputation, cleanComputation } from '../reactive/tracking.js';
import type { Computation } from '../reactive/signal.js';
import { pushContext, popContext } from '../primitives/context.js';

// Current render context
let currentFiber: Fiber | null = null;
let currentPath: string[] = [];

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

    // Create computation for this component
    const computation: Computation<void> = {
      fn: () => executeComponent(fiber, type, { ...restProps, children }),
      sources: null,
      sourceSlots: null,
      state: 1, // STALE
      cleanups: null,
    };

    fiber.computation = computation;

    // Initial render
    runComputation(computation);
  } else {
    // Intrinsic element - just render children
    fiber.children = renderChildren(children, fiberPath);
  }

  return fiber;
}

/**
 * Recursively clean up computations from a fiber tree
 * This prevents stale computations from observing signals after re-render
 * and ensures queued computations won't run (by marking them CLEAN)
 */
function cleanupFiberTree(fibers: Fiber[]): void {
  for (const fiber of fibers) {
    if (fiber.computation) {
      cleanComputation(fiber.computation);
      // Mark as CLEAN (0) so it won't run if already queued in batch
      fiber.computation.state = 0;
    }
    if (fiber.children.length > 0) {
      cleanupFiberTree(fiber.children);
    }
  }
}

/**
 * Execute a component function
 */
function executeComponent(fiber: Fiber, type: Function, props: Record<string, any>): void {
  const prevFiber = currentFiber;
  const prevPath = currentPath;

  currentFiber = fiber;
  currentPath = fiber.path;

  // Restore resource path for reactive re-renders
  // This ensures components see the correct resource path even when
  // re-executing independently (not from root)
  resourcePath = [...(fiber.incomingResourcePath ?? [])];

  // Clean up old children's computations before re-rendering
  // This prevents stale computations from observing signals
  if (fiber.children.length > 0) {
    cleanupFiberTree(fiber.children);
  }

  // Clear instance nodes and placeholder flag before re-executing component
  fiber.instanceNodes = [];
  fiber.hasPlaceholderInstance = false;

  try {
    // Execute component
    const result = type(props);

    // Render children from result
    fiber.children = renderChildren(result, fiber.path);
  } finally {
    // If this component had useInstance (real or placeholder), pop its resource path segment
    // (useInstance pushes a segment so children see it in their resource path)
    if (fiber.instanceNodes.length > 0 || fiber.hasPlaceholderInstance) {
      popResourcePath();
    }

    currentFiber = prevFiber;
    currentPath = prevPath;
  }
}

/**
 * Render children (handles various child types)
 */
function renderChildren(children: any, parentPath: string[]): Fiber[] {
  if (children == null || typeof children === 'boolean') {
    return [];
  }

  if (Array.isArray(children)) {
    return children.flatMap((child, i) => {
      const childKey = child?.key ?? i;
      const fiber = renderFiber(child, [...parentPath, String(childKey)]);
      return fiber.type === null ? [] : [fiber];
    });
  }

  const fiber = renderFiber(children, parentPath);
  return fiber.type === null ? [] : [fiber];
}

/**
 * Get node name from type and props
 */
function getNodeName(type: any, props: Record<string, any>, key?: string | number): string {
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
  if (fiber.computation) {
    cleanComputation(fiber.computation);
  }
  for (const child of fiber.children) {
    cleanupFiber(child);
  }
}
