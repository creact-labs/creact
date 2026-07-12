/**
 * Fiber - intermediate representation of component tree
 *
 * Components run once; reactivity is handled via signals and effects.
 */

import type { ContextSnapshot } from "../primitives/context";
import type { Owner } from "../reactive/owner";
import type { InstanceNode } from "./instance";
import { getActiveContext, type RuntimeContext } from "./runtime-context";

/**
 * What a fiber can represent: a function component, an intrinsic tag or
 * internal marker ("text", "fragment", "reactive-boundary"), the Fragment
 * symbol, or nothing (null/boolean children).
 */
export type FiberType =
  | ((props: Record<string, unknown>) => unknown)
  | string
  | symbol
  | null;

export interface Fiber {
  type: FiberType;
  /** User-authored props — arbitrary shapes by design */
  props: Record<string, unknown>;
  children: Fiber[];
  path: string[];
  key?: string | number;

  /**
   * The runtime this fiber belongs to — useAsyncOutput and the store attach
   * hook resolve their owning runtime through this handle, never through
   * module globals. Stamped at creation from the active render context.
   */
  ctx: RuntimeContext;

  // Instance bindings (from useAsyncOutput) - supports multiple instances per component
  instanceNodes: InstanceNode[];

  /** Live createStore state attached by the renderer (JSON-serializable) */
  store?: object;

  // Owner for reactive scope (effects, cleanups)
  owner?: Owner | null;

  // Resource path at fiber creation (only components with useAsyncOutput contribute)
  // Used to restore correct resource path during reactive re-renders
  incomingResourcePath?: string[];

  // Set when useAsyncOutput was called but returned a placeholder (undefined props)
  // Used to ensure resource path is properly popped even without a real node
  hasPlaceholderInstance?: boolean;

  // Context snapshot captured when fiber is created (inside Provider tree)
  // Used to restore context when computation re-runs from reactive system
  contextSnapshot?: ContextSnapshot;

  // Accessor function for reactive-boundary fibers (used for identity matching during reconciliation)
  _accessor?: () => unknown;

  /**
   * Original JSX element reference — used purely as an identity token when
   * matching function-component fibers during reconciliation
   */
  _element?: unknown;
}

/**
 * Create a new fiber
 */
export function createFiber(
  type: FiberType,
  props: Record<string, unknown>,
  path: string[],
  key?: string | number,
): Fiber {
  return {
    type,
    props,
    children: [],
    path,
    key,
    ctx: getActiveContext(),
    instanceNodes: [],
  };
}
