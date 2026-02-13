/**
 * Render - transform JSX to Fiber tree
 *
 * Components run once, reactivity is via signals/effects.
 */

import {
  getContextSnapshot,
  popContext,
  pushContext,
  restoreContextSnapshot,
} from "../../src/primitives/context";
import { createComputed } from "../../src/reactive/effect";
import {
  cleanupOwner,
  getOwner,
  type Owner,
  setOwner,
} from "../../src/reactive/owner";
import type { Fiber } from "./fiber";
import { createFiber } from "./fiber";

// Dev mode flag
const IS_DEV = process.env.NODE_ENV !== "production";

// Current render context
let currentFiber: Fiber | null = null;
let currentPath: string[] = [];

// Resource path - only components with useAsyncOutput contribute to this
let resourcePath: string[] = [];

/**
 * Get current fiber (for useAsyncOutput)
 * @internal
 */
export function getCurrentFiber(): Fiber | null {
  return currentFiber;
}

/**
 * Get current path
 * @internal
 */
export function getCurrentPath(): string[] {
  return [...currentPath];
}

/**
 * Get current resource path (for useAsyncOutput)
 * @internal
 */
export function getCurrentResourcePath(): string[] {
  return [...resourcePath];
}

/**
 * Push a segment to resource path
 * @internal
 */
export function pushResourcePath(segment: string): void {
  resourcePath.push(segment);
}

/**
 * Pop a segment from resource path
 * @internal
 */
export function popResourcePath(): void {
  resourcePath.pop();
}

/**
 * Reset resource path
 * @internal
 */
export function resetResourcePath(): void {
  resourcePath = [];
}

/**
 * Render a JSX element to a Fiber
 */
export function renderFiber(element: any, path: string[]): Fiber {
  // Handle null/undefined/boolean
  if (element == null || typeof element === "boolean") {
    return createFiber(null, {}, path);
  }

  // Handle primitives (text)
  if (typeof element === "string" || typeof element === "number") {
    return createFiber("text", { value: element }, path);
  }

  // Handle accessor functions (from Show, Switch, etc.) - create reactive boundary
  if (typeof element === "function" && element.length === 0) {
    const fiber = createFiber("reactive-boundary", {}, path);
    fiber._accessor = element;

    // Capture all render-time context for when effect re-runs later
    const contextSnapshot = getContextSnapshot();
    const capturedResourcePath = [...resourcePath];
    const capturedOwner = getOwner();

    // Create owner for the reactive boundary
    const owner: Owner = {
      owner: capturedOwner,
      context: null,
      cleanups: null,
      owned: null,
    };

    const prevOwner = setOwner(owner);
    fiber.owner = owner;
    fiber.contextSnapshot = contextSnapshot;

    try {
      // Use createComputed (pure) so fiber updates propagate synchronously through the Updates queue,
      // rather than being deferred to the Effects queue. This ensures fiber tree mutations
      // are visible immediately after signal writes within the same runUpdates batch.
      createComputed(() => {
        // Restore all render-time context when computation re-runs
        const prevContextSnapshot = getContextSnapshot();
        const prevResourcePath = [...resourcePath];
        const prevOwnerInEffect = getOwner();

        if (contextSnapshot) {
          restoreContextSnapshot(contextSnapshot);
        }
        resourcePath = [...capturedResourcePath];
        setOwner(owner);

        try {
          const value = element(); // This tracks dependencies

          // Render the new value into children (orphan cleanup happens inside renderChildren)
          fiber.children = renderChildren(value, path, fiber.children);
        } finally {
          // Restore previous context
          if (prevContextSnapshot) {
            restoreContextSnapshot(prevContextSnapshot);
          }
          resourcePath = prevResourcePath;
          setOwner(prevOwnerInEffect);
        }
      });
    } finally {
      setOwner(prevOwner);
    }

    return fiber;
  }

  // Handle arrays
  if (Array.isArray(element)) {
    const fiber = createFiber("fragment", {}, path);
    fiber.children = element.map((child, i) => {
      return renderFiber(child, [...path, String(i)]);
    });
    return fiber;
  }

  // Handle JSX element
  const { type, props = {}, key } = element;
  const { children, ...restProps } = props;

  // Generate path segment
  const name = key !== undefined ? String(key) : getNodeName(type);
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
  if (typeof type === "function") {
    fiber._element = element;
    fiber.incomingResourcePath = [...resourcePath];
    executeComponent(fiber, type, { ...restProps, children });
  } else {
    fiber.children = renderChildren(children, fiberPath);
  }

  return fiber;
}

/**
 * Execute a component function (runs once)
 */
function executeComponent(
  fiber: Fiber,
  type: Function,
  props: Record<string, any>,
): void {
  fiber.props = props;
  fiber.contextSnapshot = getContextSnapshot();

  const prevFiber = currentFiber;
  const prevPath = currentPath;

  if (fiber.contextSnapshot) {
    restoreContextSnapshot(fiber.contextSnapshot);
  }

  const prevContextSnapshot = getContextSnapshot();

  currentFiber = fiber;
  currentPath = fiber.path;
  resourcePath = [...(fiber.incomingResourcePath ?? [])];

  const componentName = type.name || "Component";

  // Create an owner for this component's reactive scope
  const owner: Owner = {
    owner: getOwner(),
    context: null,
    cleanups: null,
    owned: null,
  };

  const prevOwner = setOwner(owner);
  fiber.owner = owner;

  try {
    // Execute component ONCE
    const result = type(props);

    // Dev mode: Check for anti-patterns
    if (IS_DEV && result === null) {
      // Warn about potential conditional rendering anti-pattern
      console.warn(
        `[CReact] Component "${componentName}" returns null.`,
        "\n         If rendering conditionally based on signals, use <Show> or <Switch>:",
        "\n",
        "\n         // Instead of:",
        "\n         function MyComponent() {",
        "\n           const [show] = createSignal(false);",
        "\n           if (!show()) return null;",
        "\n           return <Content />;",
        "\n         }",
        "\n",
        "\n         // Use:",
        "\n         function MyComponent() {",
        "\n           const [show] = createSignal(false);",
        "\n           return <Show when={show()}><Content /></Show>;",
        "\n         }",
      );
    }

    fiber.children = renderChildren(result, fiber.path);
  } finally {
    if (fiber.instanceNodes.length > 0 || fiber.hasPlaceholderInstance) {
      popResourcePath();
    }

    restoreContextSnapshot(prevContextSnapshot);

    setOwner(prevOwner);
    currentFiber = prevFiber;
    currentPath = prevPath;
  }
}

/**
 * Render children (handles various child types)
 *
 * Uses positional matching + identity maps for reconciliation:
 * - Accessor identity map for reactive-boundary fibers (from Show, For accessors)
 * - Element identity map for function component fibers (from mapArray reuse)
 * After building the new children list, orphaned old fibers are cleaned up.
 */
function renderChildren(
  children: any,
  parentPath: string[],
  oldChildren: Fiber[] = [],
): Fiber[] {
  if (children == null || typeof children === "boolean") {
    // All old children are orphans — clean them up
    for (const old of oldChildren) {
      cleanupFiber(old);
    }
    return [];
  }

  // Build accessor identity map from old reactive-boundary children
  const oldAccessorMap = new Map<Function, Fiber>();
  // Build element identity map from old function component children
  const oldElementMap = new Map<any, Fiber>();
  for (const old of oldChildren) {
    if (old.type === "reactive-boundary" && old._accessor) {
      oldAccessorMap.set(old._accessor, old);
    } else if (old._element && typeof old.type === "function") {
      oldElementMap.set(old._element, old);
    }
  }

  let newFibers: Fiber[];
  if (Array.isArray(children)) {
    newFibers = children.flatMap((child, i) => {
      const oldAtPos = i < oldChildren.length ? oldChildren[i] : undefined;
      const fiber = renderFiberWithReconciliation(
        child,
        [...parentPath, String(i)],
        oldAtPos,
        oldAccessorMap,
        oldElementMap,
      );
      return fiber.type === null ? [] : [fiber];
    });
  } else {
    const fiber = renderFiberWithReconciliation(
      children,
      parentPath,
      oldChildren[0],
      oldAccessorMap,
      oldElementMap,
    );
    newFibers = fiber.type === null ? [] : [fiber];
  }

  // Clean up orphaned old fibers (not reused in the new set)
  const reused = new Set(newFibers);
  for (const old of oldChildren) {
    if (!reused.has(old)) {
      cleanupFiber(old);
    }
  }

  return newFibers;
}

/**
 * Render a fiber with reconciliation against old fibers
 *
 * Uses three reconciliation strategies:
 * - Accessor identity matching for reactive-boundary fibers (from Show, For accessors)
 * - Element object identity matching for function component fibers (from mapArray reuse)
 * - Positional matching for plain JSX elements and providers
 */
function renderFiberWithReconciliation(
  element: any,
  path: string[],
  oldAtPosition: Fiber | undefined,
  oldAccessorMap: Map<Function, Fiber>,
  oldElementMap: Map<any, Fiber>,
): Fiber {
  if (element == null || typeof element === "boolean") {
    return createFiber(null, {}, path);
  }

  if (typeof element === "string" || typeof element === "number") {
    return createFiber("text", { value: element }, path);
  }

  // Handle accessor functions (from Show, Switch, etc.) - create reactive boundary
  if (typeof element === "function" && element.length === 0) {
    // Match by accessor identity (handles For reorder correctly)
    const byAccessor = oldAccessorMap.get(element);
    if (byAccessor) {
      oldAccessorMap.delete(element);
      return byAccessor; // same accessor = same effect, reuse entirely
    }

    const fiber = createFiber("reactive-boundary", {}, path);
    fiber._accessor = element;

    // Capture all render-time context for when effect re-runs later
    const contextSnapshot = getContextSnapshot();
    const capturedResourcePath = [...resourcePath];
    const capturedOwner = getOwner();

    // Create owner for the reactive boundary
    const owner: Owner = {
      owner: capturedOwner,
      context: null,
      cleanups: null,
      owned: null,
    };

    const prevOwner = setOwner(owner);
    fiber.owner = owner;
    fiber.contextSnapshot = contextSnapshot;

    try {
      // Use createComputed (pure) so fiber updates propagate synchronously through the Updates queue
      createComputed(() => {
        // Restore all render-time context when computation re-runs
        const prevContextSnapshot = getContextSnapshot();
        const prevResourcePath = [...resourcePath];
        const prevOwnerInEffect = getOwner();

        if (contextSnapshot) {
          restoreContextSnapshot(contextSnapshot);
        }
        resourcePath = [...capturedResourcePath];
        setOwner(owner);

        try {
          const value = element(); // This tracks dependencies

          // Render the new value into children (orphan cleanup happens inside renderChildren)
          fiber.children = renderChildren(value, path, fiber.children);
        } finally {
          // Restore previous context
          if (prevContextSnapshot) {
            restoreContextSnapshot(prevContextSnapshot);
          }
          resourcePath = prevResourcePath;
          setOwner(prevOwnerInEffect);
        }
      });
    } finally {
      setOwner(prevOwner);
    }

    return fiber;
  }

  if (Array.isArray(element)) {
    const fiber = createFiber("fragment", {}, path);
    fiber.children = element.map((child, i) => {
      return renderFiber(child, [...path, String(i)]);
    });
    return fiber;
  }

  const { type, props = {}, key } = element;
  const { children, ...restProps } = props;

  const name = key !== undefined ? String(key) : getNodeName(type);
  const fiberPath = [...path, name];

  // Provider reconciliation — positional matching
  if (element.__isProvider && element.__context) {
    const oldFiber =
      oldAtPosition && oldAtPosition.type === type ? oldAtPosition : undefined;
    const fiber = oldFiber ?? createFiber(type, restProps, fiberPath, key);

    pushContext(element.__context, props.value);

    try {
      fiber.children = renderChildren(
        children,
        fiberPath,
        oldFiber?.children ?? [],
      );
    } finally {
      popContext(element.__context);
    }

    return fiber;
  }

  // Function component reconciliation — match by element object identity
  // mapArray preserves the same JSX element object for reused items, so same reference = same component
  if (typeof type === "function") {
    const byElement = oldElementMap.get(element);
    if (byElement) {
      oldElementMap.delete(element);
      return byElement; // same element object = same component execution, reuse entirely
    }
    // No match — create new (falls through to renderFiber)
    return renderFiber(element, path);
  }

  // Plain JSX element reconciliation — positional matching
  if (oldAtPosition && oldAtPosition.type === type) {
    oldAtPosition.props = restProps;
    oldAtPosition.children = renderChildren(
      children,
      fiberPath,
      oldAtPosition.children,
    );
    return oldAtPosition;
  }

  return renderFiber(element, path);
}

/**
 * Get node name from type
 */
function getNodeName(type: any): string {
  if (typeof type === "string") {
    return type;
  }

  if (typeof type === "function") {
    return type.name || "Component";
  }

  return "unknown";
}

/**
 * Collect all instance nodes from fiber tree
 */
export function collectInstanceNodes(fiber: Fiber): any[] {
  const nodes: any[] = [];
  function walk(f: Fiber): void {
    if (!f || !f.instanceNodes) return;
    for (const instanceNode of f.instanceNodes) {
      const snapshot = {
        ...instanceNode,
        store: f.store ? JSON.parse(JSON.stringify(f.store)) : undefined,
      };
      nodes.push(snapshot);
    }
    for (const child of f.children) {
      if (child) walk(child);
    }
  }

  if (!fiber) return nodes;
  walk(fiber);

  return nodes;
}

/**
 * Clean up a fiber tree
 */
export function cleanupFiber(fiber: Fiber): void {
  if (fiber.owner) {
    cleanupOwner(fiber.owner);
    fiber.owner = null;
  }

  for (const child of fiber.children) {
    cleanupFiber(child);
  }
}
