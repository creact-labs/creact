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
 * Uses reconcileKey (construct type + instance name) for matching,
 * allowing reconciliation across different component tree structures
 */
export declare function reconcile(previous: InstanceNode[], current: InstanceNode[]): ChangeSet;
/**
 * Deep equality check
 */
export declare function deepEqual(a: any, b: any): boolean;
/**
 * Check if there are new nodes that weren't in previous
 * Uses reconcileKey for matching consistency with reconcile()
 */
export declare function hasNewNodes(previous: InstanceNode[], current: InstanceNode[]): boolean;
