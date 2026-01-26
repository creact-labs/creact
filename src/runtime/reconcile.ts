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
export function reconcile(
  previous: InstanceNode[],
  current: InstanceNode[]
): ChangeSet {
  // Use reconcileKey for matching (stable across different component trees)
  const prevMap = new Map(previous.map((n) => [n.reconcileKey, n]));
  const currMap = new Map(current.map((n) => [n.reconcileKey, n]));

  const creates: InstanceNode[] = [];
  const updates: InstanceNode[] = [];
  const deletes: InstanceNode[] = [];

  // Find creates and updates
  for (const node of current) {
    const prev = prevMap.get(node.reconcileKey);
    if (!prev) {
      creates.push(node);
    } else if (!deepEqual(prev.props, node.props)) {
      updates.push(node);
    }
  }

  // Find deletes
  for (const node of previous) {
    if (!currMap.has(node.reconcileKey)) {
      deletes.push(node);
    }
  }

  return { creates, updates, deletes };
}

/**
 * Deep equality check
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Check if there are new nodes that weren't in previous
 * Uses reconcileKey for matching consistency with reconcile()
 */
export function hasNewNodes(previous: InstanceNode[], current: InstanceNode[]): boolean {
  const prevKeys = new Set(previous.map((n) => n.reconcileKey));
  return current.some((n) => !prevKeys.has(n.reconcileKey));
}
