/**
 * Fiber - intermediate representation of component tree
 */

import type { Computation } from '../reactive/signal.js';
import type { InstanceNode } from '../primitives/instance.js';

export interface Fiber {
  type: any;
  props: Record<string, any>;
  children: Fiber[];
  path: string[];
  key?: string | number;

  // Instance binding (from useInstance)
  instanceNode?: InstanceNode;

  // Store (from createStore)
  store?: any;

  // Effect computation (component body)
  computation?: Computation<void>;
}

/**
 * Create a new fiber
 */
export function createFiber(
  type: any,
  props: Record<string, any>,
  path: string[],
  key?: string | number
): Fiber {
  return {
    type,
    props,
    children: [],
    path,
    key,
  };
}
