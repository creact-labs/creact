/**
 * Fiber - intermediate representation of component tree
 *
 * Components run once; reactivity is handled via signals and effects.
 */

import type { Owner } from "../../src/reactive/owner";
import type { InstanceNode } from "./instance";

export interface Fiber {
  type: any;
  props: Record<string, any>;
  children: Fiber[];
  path: string[];
  key?: string | number;

  // Instance bindings (from useAsyncOutput) - supports multiple instances per component
  instanceNodes: InstanceNode[];

  // Store (from createStore)
  store?: any;

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
  contextSnapshot?: Map<symbol, any[]>;

  // Accessor function for reactive-boundary fibers (used for identity matching during reconciliation)
  _accessor?: Function;

  // Original JSX element reference (used for identity matching of function component fibers)
  _element?: any;
}

/**
 * Create a new fiber
 */
export function createFiber(
  type: any,
  props: Record<string, any>,
  path: string[],
  key?: string | number,
): Fiber {
  return {
    type,
    props,
    children: [],
    path,
    key,
    instanceNodes: [],
  };
}
