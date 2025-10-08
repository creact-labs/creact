import { FiberNode, ReRenderReason, CReactEvents } from './types';
import { ErrorRecoveryManager } from './ErrorRecoveryManager';
import { CircularDependencyError } from './errors';

/**
 * RenderScheduler - Manages batched re-rendering of components
 * 
 * Provides:
 * - Batched re-rendering to avoid excessive renders
 * - Circular dependency detection
 * - Performance safeguards and rate limiting
 * - Event hook integration for tooling
 */
export class RenderScheduler {
  private pendingReRenders = new Set<FiberNode>();
  private batchTimeout: NodeJS.Timeout | null = null;
  private eventHooks?: CReactEvents;
  private renderChain: FiberNode[] = [];
  private maxRenderDepth = 50; // Prevent infinite loops
  private rateLimitMap = new Map<FiberNode, number>();
  private maxRendersPerSecond = 10;
  private errorRecoveryManager: ErrorRecoveryManager;

  // Error handling and recovery
  private failedRenders = new Map<FiberNode, { count: number; lastFailure: number; error?: Error }>();
  private maxRetries = 3;
  private backoffMultiplier = 2;
  private baseBackoffMs = 100;

  constructor(eventHooks?: CReactEvents) {
    this.eventHooks = eventHooks;
    this.errorRecoveryManager = new ErrorRecoveryManager(eventHooks);
  }

  /**
   * Schedule a component for re-rendering with mark-and-sweep model
   * Uses batching to avoid excessive renders and prevents duplicate scheduling
   */
  schedule(fiber: FiberNode, reason: ReRenderReason, contextId?: symbol): void {
    // Rate limiting check
    if (this.isRateLimited(fiber)) {
      console.warn(`Rate limiting re-render for component at path: ${fiber.path.join('.')}`);
      return;
    }

    // Initialize reactive state if needed
    if (!fiber.reactiveState) {
      fiber.reactiveState = {
        renderCount: 0,
        isDirty: false,
        updatePending: false
      };
    }

    // Mark-and-sweep: avoid duplicate scheduling
    if (fiber.reactiveState.updatePending) {
      // Update context tracking for debugging
      if (contextId && reason === 'context-change') {
        if (!fiber.reactiveState.pendingContexts) {
          fiber.reactiveState.pendingContexts = new Set();
        }
        fiber.reactiveState.pendingContexts.add(contextId);
      }
      return; // Already scheduled, skip duplicate
    }

    // Mark as pending update
    fiber.reactiveState.updatePending = true;
    fiber.reactiveState.lastRenderReason = reason;
    fiber.reactiveState.lastRenderTime = Date.now();
    fiber.reactiveState.isDirty = true;

    // Track context for debugging
    if (contextId && reason === 'context-change') {
      fiber.reactiveState.pendingContexts = new Set([contextId]);
    }

    // Emit telemetry hook
    this.eventHooks?.onFiberReRenderScheduled?.(fiber, reason, contextId);

    this.pendingReRenders.add(fiber);
    this.scheduleBatch();
  }

  /**
   * Schedule the next batch of re-renders
   * Uses setTimeout to batch multiple changes in the same tick
   */
  private scheduleBatch(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.flushBatch();
    }, 0); // Next tick batching
  }

  /**
   * Execute all pending re-renders in a batch with error handling and recovery
   */
  private async flushBatch(): Promise<void> {
    const fibers = Array.from(this.pendingReRenders);
    this.pendingReRenders.clear();
    this.batchTimeout = null;

    if (fibers.length === 0) return;

    // Create snapshots for rollback
    const fiberSnapshots = this.createFiberSnapshots(fibers);
    const successfulRenders: FiberNode[] = [];
    const failedRenders: Array<{ fiber: FiberNode; error: Error }> = [];

    try {
      // Detect circular dependencies
      this.detectCircularDependencies(fibers);

      // Filter out fibers that have failed too many times
      const eligibleFibers = this.filterEligibleFibers(fibers);

      if (eligibleFibers.length === 0) {
        console.warn('[RenderScheduler] All fibers filtered out due to repeated failures');
        return;
      }

      // Sort by dependency order (dependents after dependencies)
      const sortedFibers = this.sortByDependencies(eligibleFibers);

      // Execute re-renders with individual error isolation
      for (const fiber of sortedFibers) {
        try {
          // Emit render start event
          this.eventHooks?.onRenderStart(fiber);
          this.renderChain.push(fiber);

          // Execute single fiber re-render
          await this.executeReRender(fiber);

          // Mark as successful
          successfulRenders.push(fiber);
          this.clearFailureRecord(fiber);

          // Update reactive state
          if (fiber.reactiveState) {
            fiber.reactiveState.renderCount++;
            fiber.reactiveState.isDirty = false;
          }

          // Emit render complete event
          this.eventHooks?.onRenderComplete(fiber);

        } catch (error) {
          // Record failure
          this.recordFailure(fiber, error as Error);
          failedRenders.push({ fiber, error: error as Error });

          // Emit error event
          this.eventHooks?.onError(error as Error, fiber);

          // Continue with other fibers (error isolation)
          console.warn(`[RenderScheduler] Fiber render failed: ${fiber.path.join('.')}, continuing with others`);
        }
      }

      // Handle partial failures with graceful degradation
      if (failedRenders.length > 0) {
        await this.handlePartialFailures(failedRenders, successfulRenders, fiberSnapshots);
      }

      // Clear render chain
      this.renderChain = [];

    } catch (error) {
      // Critical error - rollback all changes
      console.error('[RenderScheduler] Critical error during batch render, rolling back all changes');
      await this.rollbackAllChanges(fiberSnapshots);

      this.eventHooks?.onError(error as Error);
      throw error;
    }
  }

  /**
   * Execute re-renders for the given fibers
   * Integrates with the Renderer to perform actual re-rendering
   */
  private async executeReRenders(fibers: FiberNode[]): Promise<void> {
    if (fibers.length === 0) return;

    try {
      // Get the CReact instance to access the renderer
      const { getCReactInstance } = require('./CReact');
      const creact = getCReactInstance();

      if (!creact) {
        console.warn('[RenderScheduler] No CReact instance available for re-rendering');
        return;
      }

      // Use the CReact rerender method to perform actual re-rendering
      await creact.rerender('default', fibers);

      // Update render count for successfully rendered fibers
      for (const fiber of fibers) {
        if (fiber.reactiveState) {
          fiber.reactiveState.renderCount++;
          fiber.reactiveState.isDirty = false;
        }
      }
    } catch (error) {
      console.error('[RenderScheduler] Failed to execute re-renders:', error);
      throw error;
    }
  }

  /**
   * Detect circular dependencies in the render chain
   */
  private detectCircularDependencies(fibers: FiberNode[]): void {
    const visited = new Set<FiberNode>();
    const recursionStack = new Set<FiberNode>();

    for (const fiber of fibers) {
      if (this.hasCycle(fiber, visited, recursionStack)) {
        const cyclePath = Array.from(recursionStack).map(f => f.path.join('.'));
        throw new CircularDependencyError(
          `Circular dependency detected in re-render chain: ${cyclePath.join(' -> ')}`,
          cyclePath
        );
      }
    }

    // Check render chain depth
    if (this.renderChain.length > this.maxRenderDepth) {
      const chainPath = this.renderChain.map(f => f.path.join('.')).join(' -> ');
      throw new Error(`Maximum render depth exceeded (${this.maxRenderDepth}): ${chainPath}`);
    }
  }

  /**
   * Check if a fiber has circular dependencies using DFS
   */
  private hasCycle(fiber: FiberNode, visited: Set<FiberNode>, recursionStack: Set<FiberNode>): boolean {
    if (recursionStack.has(fiber)) {
      return true; // Back edge found - cycle detected
    }

    if (visited.has(fiber)) {
      return false; // Already processed
    }

    visited.add(fiber);
    recursionStack.add(fiber);

    // Check dependencies
    if (fiber.dependencies) {
      for (const dependency of Array.from(fiber.dependencies)) {
        if (this.hasCycle(dependency, visited, recursionStack)) {
          return true;
        }
      }
    }

    recursionStack.delete(fiber);
    return false;
  }

  /**
   * Sort fibers by dependency order (dependencies before dependents)
   */
  private sortByDependencies(fibers: FiberNode[]): FiberNode[] {
    const sorted: FiberNode[] = [];
    const visited = new Set<FiberNode>();
    const temp = new Set<FiberNode>();

    const visit = (fiber: FiberNode) => {
      if (temp.has(fiber)) {
        throw new Error(`Circular dependency detected during sort: ${fiber.path.join('.')}`);
      }

      if (visited.has(fiber)) {
        return;
      }

      temp.add(fiber);

      // Visit dependencies first
      if (fiber.dependencies) {
        for (const dependency of Array.from(fiber.dependencies)) {
          if (fibers.includes(dependency)) {
            visit(dependency);
          }
        }
      }

      temp.delete(fiber);
      visited.add(fiber);
      sorted.push(fiber);
    };

    for (const fiber of fibers) {
      if (!visited.has(fiber)) {
        visit(fiber);
      }
    }

    return sorted;
  }

  /**
   * Check if a fiber is rate limited
   */
  private isRateLimited(fiber: FiberNode): boolean {
    const now = Date.now();
    const lastRenderTime = this.rateLimitMap.get(fiber) || 0;
    const timeSinceLastRender = now - lastRenderTime;
    const minInterval = 1000 / this.maxRendersPerSecond; // ms between renders

    if (timeSinceLastRender < minInterval) {
      return true;
    }

    this.rateLimitMap.set(fiber, now);
    return false;
  }

  /**
   * Get pending re-renders (for testing/debugging)
   */
  getPendingReRenders(): Set<FiberNode> {
    return new Set(this.pendingReRenders);
  }

  /**
   * Clear all pending re-renders (for testing/cleanup)
   */
  clearPending(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.pendingReRenders.clear();
    this.renderChain = [];

    // Clear updatePending flags from all fibers
    Array.from(this.pendingReRenders).forEach(fiber => {
      if (fiber.reactiveState) {
        fiber.reactiveState.updatePending = false;
        fiber.reactiveState.pendingContexts?.clear();
      }
    });
  }

  /**
   * Set performance limits (for testing/configuration)
   */
  setLimits(maxRenderDepth: number, maxRendersPerSecond: number): void {
    this.maxRenderDepth = maxRenderDepth;
    this.maxRendersPerSecond = maxRendersPerSecond;
  }

  // Error Handling and Recovery Methods

  /**
   * Create snapshots of fiber states for rollback
   */
  private createFiberSnapshots(fibers: FiberNode[]): Map<FiberNode, any> {
    const snapshots = new Map<FiberNode, any>();

    fibers.forEach(fiber => {
      snapshots.set(fiber, {
        hooks: fiber.hooks ? [...fiber.hooks] : undefined,
        state: fiber.state ? { ...fiber.state } : undefined,
        reactiveState: fiber.reactiveState ? { ...fiber.reactiveState } : undefined,
        cloudDOMNodes: fiber.cloudDOMNodes ? [...fiber.cloudDOMNodes] : undefined
      });
    });

    return snapshots;
  }

  /**
   * Filter out fibers that have failed too many times
   */
  private filterEligibleFibers(fibers: FiberNode[]): FiberNode[] {
    const now = Date.now();

    return fibers.filter(fiber => {
      const failureRecord = this.failedRenders.get(fiber);

      if (!failureRecord) {
        return true; // Never failed, eligible
      }

      if (failureRecord.count >= this.maxRetries) {
        // Check if enough time has passed for retry with backoff
        const backoffTime = this.baseBackoffMs * Math.pow(this.backoffMultiplier, failureRecord.count - 1);
        const timeSinceLastFailure = now - failureRecord.lastFailure;

        if (timeSinceLastFailure < backoffTime) {
          console.warn(`[RenderScheduler] Fiber ${fiber.path.join('.')} still in backoff period`);
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Execute re-render for a single fiber
   */
  private async executeReRender(fiber: FiberNode): Promise<void> {
    try {
      // Get the CReact instance to access the renderer
      const { getCReactInstance } = require('./CReact');
      const creact = getCReactInstance();

      if (!creact) {
        console.warn('[RenderScheduler] No CReact instance available for re-rendering');
        return;
      }

      // Note: Previously skipped re-renders during initial build, but now that
      // CloudDOMBuilder properly handles re-render scenarios, we allow all re-renders

      // Use selective re-rendering to avoid rebuilding the entire tree
      const renderer = (creact as any).renderer;
      if (renderer && renderer.reRenderComponents) {
        renderer.reRenderComponents([fiber], 'manual');
      } else {
        console.warn('[RenderScheduler] Renderer not available for selective re-rendering');
      }

      // Update render count
      if (fiber.reactiveState) {
        fiber.reactiveState.renderCount++;
        fiber.reactiveState.isDirty = false;
      }
    } catch (error) {
      console.error('[RenderScheduler] Failed to execute re-render for fiber:', fiber.path.join('.'), error);
      throw error;
    }
  }

  /**
   * Record a failure for a fiber
   */
  private recordFailure(fiber: FiberNode, error: Error): void {
    const existing = this.failedRenders.get(fiber);

    if (existing) {
      existing.count++;
      existing.lastFailure = Date.now();
      existing.error = error;
    } else {
      this.failedRenders.set(fiber, {
        count: 1,
        lastFailure: Date.now(),
        error
      });
    }
  }

  /**
   * Clear failure record for a fiber (after successful render)
   */
  private clearFailureRecord(fiber: FiberNode): void {
    this.failedRenders.delete(fiber);
  }

  /**
   * Handle partial failures with graceful degradation
   */
  private async handlePartialFailures(
    failedRenders: Array<{ fiber: FiberNode; error: Error }>,
    successfulRenders: FiberNode[],
    fiberSnapshots: Map<FiberNode, any>
  ): Promise<void> {
    console.warn(`[RenderScheduler] Partial failure: ${failedRenders.length} failed, ${successfulRenders.length} succeeded`);

    // Check if we should rollback successful renders due to dependencies
    const shouldRollback = this.shouldRollbackSuccessfulRenders(failedRenders, successfulRenders);

    if (shouldRollback) {
      console.warn('[RenderScheduler] Rolling back successful renders due to dependency failures');
      await this.rollbackFibers(successfulRenders, fiberSnapshots);
    } else {
      console.info('[RenderScheduler] Continuing with partial success (graceful degradation)');
    }

    // Schedule retry for failed renders with backoff
    this.scheduleRetries(failedRenders);
  }

  /**
   * Determine if successful renders should be rolled back due to dependency failures
   */
  private shouldRollbackSuccessfulRenders(
    failedRenders: Array<{ fiber: FiberNode; error: Error }>,
    successfulRenders: FiberNode[]
  ): boolean {
    // Check if any successful render depends on a failed render
    for (const successfulFiber of successfulRenders) {
      if (successfulFiber.dependencies) {
        const dependencyArray = Array.from(successfulFiber.dependencies);
        for (const dependency of dependencyArray) {
          if (failedRenders.some(failed => failed.fiber === dependency)) {
            return true; // Successful fiber depends on failed fiber
          }
        }
      }
    }

    return false;
  }

  /**
   * Rollback specific fibers to their snapshots
   */
  private async rollbackFibers(fibers: FiberNode[], snapshots: Map<FiberNode, any>): Promise<void> {
    for (const fiber of fibers) {
      const snapshot = snapshots.get(fiber);
      if (snapshot) {
        // Restore fiber state
        fiber.hooks = snapshot.hooks ? [...snapshot.hooks] : undefined;
        fiber.state = snapshot.state ? { ...snapshot.state } : undefined;
        fiber.reactiveState = snapshot.reactiveState ? { ...snapshot.reactiveState } : undefined;
        fiber.cloudDOMNodes = snapshot.cloudDOMNodes ? [...snapshot.cloudDOMNodes] : undefined;
      }
    }
  }

  /**
   * Rollback all changes (critical error recovery)
   */
  private async rollbackAllChanges(snapshots: Map<FiberNode, any>): Promise<void> {
    const fibers = Array.from(snapshots.keys());
    await this.rollbackFibers(fibers, snapshots);
  }

  /**
   * Schedule retries for failed renders with exponential backoff
   */
  private scheduleRetries(failedRenders: Array<{ fiber: FiberNode; error: Error }>): void {
    for (const { fiber } of failedRenders) {
      const failureRecord = this.failedRenders.get(fiber);

      if (failureRecord && failureRecord.count < this.maxRetries) {
        const backoffTime = this.baseBackoffMs * Math.pow(this.backoffMultiplier, failureRecord.count);

        setTimeout(() => {
          console.info(`[RenderScheduler] Retrying failed render for ${fiber.path.join('.')}`);
          this.schedule(fiber, 'manual'); // Retry with manual reason
        }, backoffTime);
      }
    }
  }

  /**
   * Get failure statistics (for monitoring/debugging)
   */
  getFailureStats(): {
    totalFailures: number;
    fibersWithFailures: number;
    averageFailureCount: number;
  } {
    const totalFailures = Array.from(this.failedRenders.values()).reduce((sum, record) => sum + record.count, 0);
    const fibersWithFailures = this.failedRenders.size;
    const averageFailureCount = fibersWithFailures > 0 ? totalFailures / fibersWithFailures : 0;

    return {
      totalFailures,
      fibersWithFailures,
      averageFailureCount
    };
  }

  /**
   * Clear all failure records (for testing/cleanup)
   */
  clearFailureRecords(): void {
    this.failedRenders.clear();
  }
}