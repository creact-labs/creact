/**
 * ReactiveUpdateQueue - Tracks fibers that need re-rendering due to state changes
 * 
 * This queue handles user-triggered state changes (via useState) separately from
 * provider-driven output changes. It enables the reactivity phase to detect and
 * re-render components that have internal state changes.
 * 
 * REQ-4.4: Fiber dirty tracking for state-driven re-renders
 */

import { FiberNode } from './types';

/**
 * Global queue for tracking fibers that need re-rendering
 */
class ReactiveUpdateQueue {
  private dirtyFibers = new Set<FiberNode>();
  private isProcessing = false;

  /**
   * Enqueue a fiber for re-rendering due to state change
   * Uses Set to automatically deduplicate multiple setState calls
   * 
   * @param fiber - Fiber node that needs re-rendering
   */
  enqueue(fiber: FiberNode): void {
    if (this.isProcessing) {
      // Don't enqueue during processing to avoid infinite loops
      if (process.env.CREACT_DEBUG === 'true') {
        console.debug(`[ReactiveUpdateQueue] Skipping enqueue during processing: ${fiber.path?.join('.')}`);
      }
      return;
    }

    this.dirtyFibers.add(fiber);
    
    if (process.env.CREACT_DEBUG === 'true') {
      console.debug(`[ReactiveUpdateQueue] Enqueued fiber: ${fiber.path?.join('.')} (queue size: ${this.dirtyFibers.size})`);
    }
  }

  /**
   * Flush the queue and return all dirty fibers
   * Clears the queue after returning
   * 
   * @returns Array of dirty fibers that need re-rendering
   */
  flush(): FiberNode[] {
    if (this.isProcessing) {
      if (process.env.CREACT_DEBUG === 'true') {
        console.debug('[ReactiveUpdateQueue] Already processing, returning empty array');
      }
      return [];
    }

    this.isProcessing = true;
    const fibers = Array.from(this.dirtyFibers);
    this.dirtyFibers.clear();
    this.isProcessing = false;

    if (process.env.CREACT_DEBUG === 'true') {
      console.debug(`[ReactiveUpdateQueue] Flushed ${fibers.length} dirty fibers`);
    }

    return fibers;
  }

  /**
   * Check if a fiber is in the queue
   * 
   * @param fiber - Fiber to check
   * @returns True if fiber is queued for re-render
   */
  has(fiber: FiberNode): boolean {
    return this.dirtyFibers.has(fiber);
  }

  /**
   * Get current queue size
   * 
   * @returns Number of fibers in queue
   */
  size(): number {
    return this.dirtyFibers.size;
  }

  /**
   * Clear the queue without processing
   * Used for cleanup or error recovery
   */
  clear(): void {
    this.dirtyFibers.clear();
    this.isProcessing = false;
    
    if (process.env.CREACT_DEBUG === 'true') {
      console.debug('[ReactiveUpdateQueue] Queue cleared');
    }
  }
}

// Global singleton instance
const globalQueue = new ReactiveUpdateQueue();

/**
 * Get the global reactive update queue
 * 
 * @returns Global ReactiveUpdateQueue instance
 */
export function getReactiveUpdateQueue(): ReactiveUpdateQueue {
  return globalQueue;
}
