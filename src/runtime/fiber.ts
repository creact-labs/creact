/**
 * Fiber - intermediate representation of component tree
 */

import type { InstanceNode } from '../primitives/instance';
import type { Computation } from '../reactive/signal';

export interface Fiber {
  type: any;
  props: Record<string, any>;
  children: Fiber[];
  path: string[];
  key?: string | number;

  // Instance bindings (from useInstance) - supports multiple instances per component
  instanceNodes: InstanceNode[];

  // Store (from createStore)
  store?: any;

  // Effect computation (component body)
  computation?: Computation<void>;

  // Resource path at fiber creation (only components with useInstance contribute)
  // Used to restore correct resource path during reactive re-renders
  incomingResourcePath?: string[];

  // Set when useInstance was called but returned a placeholder (undefined props)
  // Used to ensure resource path is properly popped even without a real node
  hasPlaceholderInstance?: boolean;
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
