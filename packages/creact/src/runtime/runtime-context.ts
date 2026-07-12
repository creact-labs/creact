/**
 * RuntimeContext - all per-runtime mutable state, scoped to one runtime.
 *
 * Every CReactRuntime owns one context; N runtimes coexist in a process
 * with zero cross-talk. A module-level slot (like CurrentOwner/Listener)
 * points at the context currently rendering; synchronous render sections
 * set it and restore the previous value, and reactive boundaries restore
 * the context they were created under before re-rendering.
 *
 * A default context backs render-time state outside any runtime (direct
 * renderFiber calls in tests, stores created outside components).
 */

// Type-only imports — erased at runtime, so the value-import graph stays
// acyclic (fiber/instance/run import values from this module)
import type { Fiber } from "./fiber";
import type { InstanceNode } from "./instance";
import type { Memory } from "./memory";
import type { RenderOptions } from "./run";

/** The mutable state one runtime owns */
export interface RuntimeContext {
  /** Instance nodes by id (useAsyncOutput registry) */
  nodeRegistry: Map<string, InstanceNode>;
  /** nodeId → owning fiber path (duplicate-id detection) */
  nodeOwnership: Map<string, string>;
  /** nodeId → persisted outputs awaiting hydration */
  outputHydration: Map<string, Record<string, unknown>>;
  /** component path → persisted store state awaiting hydration */
  storeHydration: Map<string, object>;
  /** context id → value stack (render-time context traversal) */
  contextStacks: Map<symbol, unknown[]>;
  /** Fiber whose component is currently executing */
  currentFiber: Fiber | null;
  /** Fiber path of the executing component */
  currentPath: string[];
  /** Resource path — only components with useAsyncOutput contribute */
  resourcePath: string[];
  /** Backend of the owning runtime (inherited across runtime boundaries) */
  memory?: Memory;
  /** Options of the owning runtime (inherited across runtime boundaries) */
  options?: RenderOptions;
}

export function createRuntimeContext(): RuntimeContext {
  return {
    nodeRegistry: new Map(),
    nodeOwnership: new Map(),
    outputHydration: new Map(),
    storeHydration: new Map(),
    contextStacks: new Map(),
    currentFiber: null,
    currentPath: [],
    resourcePath: [],
  };
}

/**
 * Context used when no runtime is active: direct renderFiber calls in
 * tests, stores created outside components. Reset by resetRuntime().
 */
export const defaultContext = createRuntimeContext();

/**
 * Every live context (default + one per runtime). Global by design, like
 * activeRuntimes: it backs the id-based registry helpers (getNodeById,
 * getAllNodes, …) that tests use without naming a runtime, and lets
 * resetRuntime() sweep everything.
 */
export const allContexts = new Set<RuntimeContext>([defaultContext]);

// The currently rendering context (module slot, CurrentOwner-style)
let activeContext: RuntimeContext | null = null;

/** The context render-time state resolves against right now */
export function getActiveContext(): RuntimeContext {
  return activeContext ?? defaultContext;
}

/** Swap the active context; returns the previous slot value to restore */
export function setActiveContext(
  ctx: RuntimeContext | null,
): RuntimeContext | null {
  const prev = activeContext;
  activeContext = ctx;
  return prev;
}
