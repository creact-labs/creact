
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

/**
 * ReactiveUpdateQueue - Tracks fibers that need re-rendering due to state changes
 *
 * This queue handles user-triggered state changes (via useState) separately from
 * provider-driven output changes. It enables the reactivity phase to detect and
 * re-render components that have internal state changes.
 *
 * REQ-4.4: Fiber dirty tracking for state-driven re-renders
 */

import { LoggerFactory } from '../utils/Logger';

const logger = LoggerFactory.getLogger('hooks');

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
      logger.debug(`Skipping enqueue during processing: ${fiber.path?.join('.')}`);
      return;
    }

    this.dirtyFibers.add(fiber);

    logger.debug(`Enqueued fiber: ${fiber.path?.join('.')} (queue size: ${this.dirtyFibers.size})`);
  }

  /**
   * Flush the queue and return all dirty fibers
   * Clears the queue after returning
   *
   * @returns Array of dirty fibers that need re-rendering
   */
  flush(): FiberNode[] {
    if (this.isProcessing) {
      logger.debug('Already processing, returning empty array');
      return [];
    }

    this.isProcessing = true;
    const fibers = Array.from(this.dirtyFibers);
    this.dirtyFibers.clear();
    this.isProcessing = false;

    logger.debug(`Flushed ${fibers.length} dirty fibers`);

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

    logger.debug('Queue cleared');
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
