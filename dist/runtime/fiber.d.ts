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
    instanceNodes: InstanceNode[];
    store?: any;
    computation?: Computation<void>;
    incomingResourcePath?: string[];
    hasPlaceholderInstance?: boolean;
}
/**
 * Create a new fiber
 */
export declare function createFiber(type: any, props: Record<string, any>, path: string[], key?: string | number): Fiber;
