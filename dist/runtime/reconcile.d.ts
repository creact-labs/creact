/**
 * Reconciler - diff two sets of instance nodes
 */
import type { InstanceNode } from '../primitives/instance.js';
export interface ChangeSet {
    creates: InstanceNode[];
    updates: InstanceNode[];
    deletes: InstanceNode[];
}
/**
 * Reconcile previous and current instance nodes
 */
export declare function reconcile(previous: InstanceNode[], current: InstanceNode[]): ChangeSet;
/**
 * Deep equality check
 */
export declare function deepEqual(a: any, b: any): boolean;
/**
 * Check if there are new nodes that weren't in previous
 */
export declare function hasNewNodes(previous: InstanceNode[], current: InstanceNode[]): boolean;
