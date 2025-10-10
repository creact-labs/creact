
/**

 * Licensed under the Apache License, Version 2.0 (the "License");

 * you may not use this file except in compliance with the License.

 * You may obtain a copy of the License at

 *

 *     http://www.apache.org/licenses/LICENSE-2.0

 *

 * Unless required by applicable law or agreed to in writing, software

 * distributed under the License is distributed on an "AS IS" BASIS,

 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

 * See the License for the specific language governing permissions and

 * limitations under the License.

 *

 * Copyright 2025 Daniel Coutinho Ribeiro

 */

import { FiberNode, CReactEvents } from './types';

/**
 * ContextDependencyTracker - Manages context dependencies and change detection
 *
 * Key Features:
 * - Track which components consume which contexts
 * - Detect context value changes
 * - Trigger re-renders only for components with output-bound context values
 * - Integrate with StateBindingManager for selective reactivity
 *
 * Optimizations:
 * - Uses Map<FiberNode, number[]> instead of Set<object> for stable identity
 * - Smart equality checking with structural hashing
 * - Direct StateBindingManager integration
 * - Event hooks for observability
 */
export class ContextDependencyTracker {
  // Map context ID to consuming fibers and their hook indices (stable identity)
  private contextConsumers = new Map<symbol, Map<FiberNode, number[]>>();

  // Map context ID to current value for change detection
  private contextValues = new Map<symbol, any>();

  // Map context ID to previous value for rollback capability
  private previousContextValues = new Map<symbol, any>();

  // Map fiber to consumed contexts for cleanup
  private fiberContexts = new WeakMap<FiberNode, Set<symbol>>();

  // Structural hash cache for performance
  private valueHashCache = new WeakMap<object, string>();

  // Event hooks for observability
  private eventHooks?: CReactEvents;

  // StateBindingManager reference for direct integration
  private stateBindingManager?: any;

  constructor(eventHooks?: CReactEvents) {
    this.eventHooks = eventHooks;
  }

  /**
   * Set StateBindingManager reference for direct integration
   */
  setStateBindingManager(stateBindingManager: any): void {
    this.stateBindingManager = stateBindingManager;
  }

  /**
   * Track that a component is consuming a context
   * Called by enhanced useContext hook
   * Uses stable Map<FiberNode, number[]> for reliable cleanup
   */
  trackContextConsumption(contextId: symbol, fiber: FiberNode, hookIndex?: number): void {
    // Track consumer with stable identity
    if (!this.contextConsumers.has(contextId)) {
      this.contextConsumers.set(contextId, new Map());
    }

    const fiberMap = this.contextConsumers.get(contextId)!;
    if (!fiberMap.has(fiber)) {
      fiberMap.set(fiber, []);
    }

    // Add hook index if provided and not already tracked
    if (hookIndex !== undefined) {
      const hookIndices = fiberMap.get(fiber)!;
      if (!hookIndices.includes(hookIndex)) {
        hookIndices.push(hookIndex);
      }
    }

    // Track fiber's contexts for cleanup
    if (!this.fiberContexts.has(fiber)) {
      this.fiberContexts.set(fiber, new Set());
    }
    this.fiberContexts.get(fiber)!.add(contextId);
  }

  /**
   * Update context value and detect changes with rollback support
   * Called when a context provider value changes
   * Returns fibers that need re-rendering due to the change
   */
  updateContextValue(contextId: symbol, newValue: any): FiberNode[] {
    const previousValue = this.contextValues.get(contextId);

    // Check if value actually changed using smart equality
    if (this.smartEqual(previousValue, newValue)) {
      return []; // No change, no re-renders needed
    }

    // Store previous value for potential rollback
    if (previousValue !== undefined) {
      this.previousContextValues.set(contextId, previousValue);
    }

    // Emit context update event for observability
    this.eventHooks?.onContextUpdate?.(contextId, previousValue, newValue);

    // Update stored value
    this.contextValues.set(contextId, newValue);

    // Find consuming fibers that need re-rendering
    const fiberMap = this.contextConsumers.get(contextId);
    if (!fiberMap) {
      return [];
    }

    const affectedFibers: FiberNode[] = [];

    // Iterate over fibers with stable identity
    Array.from(fiberMap.entries()).forEach(([fiber, hookIndices]) => {
      // Check each hook index for output binding
      for (const hookIndex of hookIndices) {
        // Only trigger re-render if the context value is bound to output
        // This implements the requirement: "only to states binded to output"
        if (this.isContextValueBoundToOutput(fiber, contextId, hookIndex)) {
          affectedFibers.push(fiber);
          break; // Only add fiber once, even if multiple hooks are bound
        }
      }
    });

    return affectedFibers;
  }

  /**
   * Rollback context value to previous state
   * Used when provider update fails (e.g., backend error)
   *
   * @param contextId - Context to rollback
   * @returns True if rollback was successful, false if no previous value exists
   */
  rollbackContextValue(contextId: symbol): boolean {
    const previousValue = this.previousContextValues.get(contextId);

    if (previousValue === undefined) {
      return false; // No previous value to rollback to
    }

    // Restore previous value
    this.contextValues.set(contextId, previousValue);

    // Clear the rollback value
    this.previousContextValues.delete(contextId);

    // Emit rollback event for observability
    this.eventHooks?.onContextUpdate?.(contextId, this.contextValues.get(contextId), previousValue);

    return true;
  }

  /**
   * Get previous context value (for debugging/inspection)
   */
  getPreviousContextValue(contextId: symbol): any {
    return this.previousContextValues.get(contextId);
  }

  /**
   * Check if a context value is bound to provider output
   * Direct integration with StateBindingManager for accurate detection
   */
  private isContextValueBoundToOutput(
    fiber: FiberNode,
    contextId: symbol,
    hookIndex: number
  ): boolean {
    // Direct StateBindingManager integration
    if (this.stateBindingManager) {
      return this.stateBindingManager.isFiberBoundToOutput?.(fiber, contextId, hookIndex) ?? false;
    }

    // Fallback: check if fiber has any output bindings
    return this.hasOutputBindings(fiber);
  }

  /**
   * Check if a fiber has any output bindings (fallback method)
   * This is used when StateBindingManager is not available
   */
  private hasOutputBindings(fiber: FiberNode): boolean {
    // Check if fiber has cloudDOMNodes (indicates it uses useInstance)
    if (fiber.cloudDOMNodes && fiber.cloudDOMNodes.length > 0) {
      return true;
    }

    // Check if fiber has state that could be bound to outputs
    if (fiber.hooks && fiber.hooks.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Get current context value
   */
  getContextValue(contextId: symbol): any {
    return this.contextValues.get(contextId);
  }

  /**
   * Set initial context value (when provider is first rendered)
   */
  setInitialContextValue(contextId: symbol, value: any): void {
    if (!this.contextValues.has(contextId)) {
      this.contextValues.set(contextId, value);
    }
  }

  /**
   * Remove context dependencies for a fiber (cleanup)
   * O(n) stable operation with Map-based storage
   */
  removeContextDependenciesForFiber(fiber: FiberNode): void {
    const contexts = this.fiberContexts.get(fiber);
    if (!contexts) {
      return;
    }

    // Remove fiber from all context consumer lists (stable cleanup)
    Array.from(contexts).forEach((contextId) => {
      const fiberMap = this.contextConsumers.get(contextId);
      if (fiberMap) {
        // Direct fiber removal with Map
        fiberMap.delete(fiber);

        // Clean up empty consumer maps
        if (fiberMap.size === 0) {
          this.contextConsumers.delete(contextId);
        }
      }
    });

    // Remove fiber's context tracking
    this.fiberContexts.delete(fiber);
  }

  /**
   * Remove all consumers for a context (when provider is unmounted)
   * Safe iteration to avoid mid-loop deletion issues
   */
  removeContextConsumers(contextId: symbol): void {
    const fiberMap = this.contextConsumers.get(contextId);
    if (fiberMap) {
      // Convert to array first to avoid mid-loop deletion issues
      const fibers = Array.from(fiberMap.keys());

      // Remove context from each fiber's tracking
      fibers.forEach((fiber) => {
        const fiberContexts = this.fiberContexts.get(fiber);
        if (fiberContexts) {
          fiberContexts.delete(contextId);
          if (fiberContexts.size === 0) {
            this.fiberContexts.delete(fiber);
          }
        }
      });
    }

    // Remove context tracking
    this.contextConsumers.delete(contextId);
    this.contextValues.delete(contextId);
  }

  /**
   * Get all consumers for a context (for debugging)
   */
  getContextConsumers(contextId: symbol): Array<{ fiber: FiberNode; hookIndices: number[] }> {
    const fiberMap = this.contextConsumers.get(contextId);
    if (!fiberMap) {
      return [];
    }

    return Array.from(fiberMap.entries()).map(([fiber, hookIndices]) => ({
      fiber,
      hookIndices: [...hookIndices],
    }));
  }

  /**
   * Get all contexts consumed by a fiber (for debugging)
   */
  getFiberContexts(fiber: FiberNode): symbol[] {
    const contexts = this.fiberContexts.get(fiber);
    return contexts ? Array.from(contexts) : [];
  }

  /**
   * Get statistics about context dependencies
   */
  getContextStats(): {
    totalContexts: number;
    totalConsumers: number;
    contextsWithConsumers: number;
    totalHookBindings: number;
  } {
    let totalConsumers = 0;
    let contextsWithConsumers = 0;
    let totalHookBindings = 0;

    Array.from(this.contextConsumers.values()).forEach((fiberMap) => {
      totalConsumers += fiberMap.size;
      if (fiberMap.size > 0) {
        contextsWithConsumers++;
      }

      // Count total hook bindings
      Array.from(fiberMap.values()).forEach((hookIndices) => {
        totalHookBindings += hookIndices.length;
      });
    });

    return {
      totalContexts: this.contextValues.size,
      totalConsumers,
      contextsWithConsumers,
      totalHookBindings,
    };
  }

  /**
   * Clear all context dependencies (for testing/cleanup)
   */
  clearAllDependencies(): void {
    this.contextConsumers.clear();
    this.contextValues.clear();
    // Note: WeakMap doesn't have clear(), but clearing the other maps
    // will effectively orphan the WeakMap entries for GC
  }

  /**
   * Smart equality check for context values
   * Uses shallow equality by default with structural hashing for complex objects
   */
  private smartEqual(a: any, b: any): boolean {
    // Fast path: reference equality
    if (a === b) return true;

    // Handle null/undefined
    if (a == null || b == null) return a === b;

    // Different types are not equal
    if (typeof a !== typeof b) return false;

    // Primitives
    if (typeof a !== 'object') return a === b;

    // Try shallow equality first (common case for infrastructure contexts)
    if (this.shallowEqual(a, b)) return true;

    // Fall back to structural hash comparison for complex objects
    return this.structuralHashEqual(a, b);
  }

  /**
   * Shallow equality check for objects
   */
  private shallowEqual(a: any, b: any): boolean {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key) || a[key] !== b[key]) return false;
    }

    return true;
  }

  /**
   * Structural hash-based equality for complex objects
   * Uses WeakMap caching for performance
   */
  private structuralHashEqual(a: any, b: any): boolean {
    try {
      const hashA = this.getStructuralHash(a);
      const hashB = this.getStructuralHash(b);
      return hashA === hashB;
    } catch {
      // Fallback to deep equality if hashing fails
      return this.deepEqual(a, b);
    }
  }

  /**
   * Get structural hash of an object with caching
   */
  private getStructuralHash(obj: any): string {
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }

    // Check cache first
    if (this.valueHashCache.has(obj)) {
      return this.valueHashCache.get(obj)!;
    }

    // Generate hash
    const hash = this.generateStructuralHash(obj);
    this.valueHashCache.set(obj, hash);
    return hash;
  }

  /**
   * Generate structural hash using JSON.stringify with sorted keys
   */
  private generateStructuralHash(obj: any): string {
    try {
      // Sort keys for consistent hashing
      const sortedObj = this.sortObjectKeys(obj);
      return JSON.stringify(sortedObj);
    } catch {
      // Fallback for non-serializable objects
      return `[object ${obj.constructor?.name || 'Object'}]`;
    }
  }

  /**
   * Recursively sort object keys for consistent hashing
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    }

    const sorted: any = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      sorted[key] = this.sortObjectKeys(obj[key]);
    }

    return sorted;
  }

  /**
   * Deep equality check (fallback method)
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (a == null || b == null) return a === b;

    if (typeof a !== typeof b) return false;

    if (typeof a !== 'object') return a === b;

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEqual(a[key], b[key])) return false;
    }

    return true;
  }
}
