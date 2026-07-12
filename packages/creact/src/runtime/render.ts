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
} from "../primitives/context";
import { hydrateStore, setStoreAttachHook } from "../store/store";
import { createComputed } from "../reactive/effect";
import {
  cleanupOwner,
  getOwner,
  type Owner,
  setOwner,
} from "../reactive/owner";
import type { Fiber } from "./fiber";
import { createFiber } from "./fiber";

// Dev mode flag
const IS_DEV = process.env.NODE_ENV !== "production";

// Wire createStore to the fiber tree: stores created during component
// execution are attached to the fiber (persisted with its instance nodes)
// and hydrated from the previous run's state. Keyed by the component's
// resource path — matches prepareHydration's node.path.slice(0, -1).
setStoreAttachHook((initial) => {
  const fiber = currentFiber;
  if (!fiber) return undefined; // store created outside a component
  const state = hydrateStore<object>(getCurrentResourcePath()) ?? initial;
  fiber.store = state; // live reference — snapshotted on every collect
  return state;
});

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
 * Create a reactive-boundary fiber for a zero-arg accessor (from Show,
 * Switch, For, or plain accessor children).
 *
 * Captures the render-time context (context stacks, resource path, owner)
 * and re-renders its children through a createComputed whenever the
 * accessor's dependencies change. createComputed (pure) is used so fiber
 * updates propagate synchronously through the Updates queue rather than
 * being deferred to the Effects queue — fiber tree mutations must be
 * visible immediately after signal writes within the same runUpdates batch.
 */
function createReactiveBoundaryFiber(element: () => any, path: string[]): Fiber {
  const fiber = createFiber("reactive-boundary", {}, path);
  fiber._accessor = element;

  // Capture all render-time context for when the computation re-runs later
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

/**
 * Handle empty children (null/undefined/boolean) and primitive text —
 * shared prologue of both render paths. Returns null for anything else.
 */
function renderLeafFiber(element: any, path: string[]): Fiber | null {
  if (element == null || typeof element === "boolean") {
    return createFiber(null, {}, path);
  }

  if (typeof element === "string" || typeof element === "number") {
    return createFiber("text", { value: element }, path);
  }

  return null;
}

/**
 * Render a JSX element to a Fiber
 */
export function renderFiber(element: any, path: string[]): Fiber {
  const leaf = renderLeafFiber(element, path);
  if (leaf) return leaf;

  // Handle accessor functions (from Show, Switch, etc.) - create reactive boundary
  if (typeof element === "function" && element.length === 0) {
    return createReactiveBoundaryFiber(element, path);
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
  // renderFiber assigns incomingResourcePath right before calling us
  resourcePath = [...fiber.incomingResourcePath!];

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

  const { oldAccessorMap, oldElementMap } = buildIdentityMaps(oldChildren);

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
    // A single non-array child is never null/boolean (caught by the early
    // return above), so it always yields a real fiber
    newFibers = [fiber];
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
 * Identity maps over the previous children:
 * - accessor identity for reactive-boundary fibers (from Show, For accessors)
 * - element object identity for function component fibers (from mapArray reuse)
 */
function buildIdentityMaps(oldChildren: Fiber[]): {
  oldAccessorMap: Map<Function, Fiber>;
  oldElementMap: Map<any, Fiber>;
} {
  const oldAccessorMap = new Map<Function, Fiber>();
  const oldElementMap = new Map<any, Fiber>();
  for (const old of oldChildren) {
    if (old.type === "reactive-boundary" && old._accessor) {
      oldAccessorMap.set(old._accessor, old);
    } else if (old._element && typeof old.type === "function") {
      oldElementMap.set(old._element, old);
    }
  }
  return { oldAccessorMap, oldElementMap };
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
  const leaf = renderLeafFiber(element, path);
  if (leaf) return leaf;

  // Handle accessor functions (from Show, Switch, etc.) - create reactive boundary
  if (typeof element === "function" && element.length === 0) {
    return reconcileAccessorFiber(element, path, oldAccessorMap);
  }

  if (Array.isArray(element)) {
    // Same fragment handling as a fresh render
    return renderFiber(element, path);
  }

  const { type, key } = element;
  const name = key !== undefined ? String(key) : getNodeName(type);
  const fiberPath = [...path, name];

  // Provider reconciliation — positional matching
  if (element.__isProvider && element.__context) {
    return reconcileProviderFiber(element, fiberPath, oldAtPosition);
  }

  // Function component reconciliation — match by element object identity
  if (typeof type === "function") {
    return reconcileComponentFiber(element, path, oldElementMap);
  }

  return reconcilePlainFiber(element, fiberPath, path, oldAtPosition);
}

/** Match accessors by identity (handles For reorder correctly) */
function reconcileAccessorFiber(
  element: () => any,
  path: string[],
  oldAccessorMap: Map<Function, Fiber>,
): Fiber {
  const byAccessor = oldAccessorMap.get(element);
  if (byAccessor) {
    oldAccessorMap.delete(element);
    return byAccessor; // same accessor = same effect, reuse entirely
  }

  return createReactiveBoundaryFiber(element, path);
}

/**
 * Function component reconciliation — mapArray preserves the same JSX element
 * object for reused items, so same reference = same component execution
 */
function reconcileComponentFiber(
  element: any,
  path: string[],
  oldElementMap: Map<any, Fiber>,
): Fiber {
  const byElement = oldElementMap.get(element);
  if (byElement) {
    oldElementMap.delete(element);
    return byElement; // same element object = same component execution, reuse entirely
  }
  // No match — create new (falls through to renderFiber)
  return renderFiber(element, path);
}

/** Plain JSX element reconciliation — positional matching, update in place */
function reconcilePlainFiber(
  element: any,
  fiberPath: string[],
  path: string[],
  oldAtPosition: Fiber | undefined,
): Fiber {
  const { type, props = {} } = element;
  const { children, ...restProps } = props;

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
 * Provider reconciliation — reuse the fiber at the same position when it is
 * the same provider, pushing the (possibly new) context value for children
 */
function reconcileProviderFiber(
  element: any,
  fiberPath: string[],
  oldAtPosition: Fiber | undefined,
): Fiber {
  const { type, props = {}, key } = element;
  const { children, ...restProps } = props;

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
  // createFiber always initializes instanceNodes/children, so only the
  // root needs a null check
  function walk(f: Fiber): void {
    for (const instanceNode of f.instanceNodes) {
      const snapshot = {
        ...instanceNode,
        store: f.store ? JSON.parse(JSON.stringify(f.store)) : undefined,
      };
      nodes.push(snapshot);
    }
    for (const child of f.children) {
      walk(child);
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
