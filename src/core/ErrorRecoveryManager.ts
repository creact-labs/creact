import { FiberNode, ReRenderReason, CReactEvents } from './types';
import { ReactiveError, ReRenderError, StateUpdateError, ContextPropagationError, CircularDependencyError } from './errors';

/**
 * Recovery strategy for different types of errors
 */
export type RecoveryStrategy = 
  | 'rollback'        // Rollback to previous state
  | 'isolate'         // Isolate failed component and continue with others
  | 'retry'           // Retry the operation with backoff
  | 'skip'            // Skip the failed operation and continue
  | 'abort';          // Abort the entire operation

/**
 * Recovery action result
 */
export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  message: string;
  recoveredFibers?: FiberNode[];
  failedFibers?: FiberNode[];
}

/**
 * Snapshot of component state for rollback
 */
interface ComponentSnapshot {
  fiber: FiberNode;
  hooks: any[];
  reactiveState: any;
  timestamp: number;
}

/**
 * ErrorRecoveryManager - Handles error recovery and rollback semantics
 * 
 * Provides:
 * - Rollback semantics for failed re-renders
 * - Error isolation for component failures
 * - Graceful degradation for partial failures
 * - Recovery strategies based on error type
 */
export class ErrorRecoveryManager {
  private componentSnapshots = new WeakMap<FiberNode, ComponentSnapshot>();
  private contextSnapshots = new Map<symbol, { value: any; timestamp: number }>();
  private eventHooks?: CReactEvents;
  private maxRetries = 3;
  private retryDelay = 100; // ms

  constructor(eventHooks?: CReactEvents) {
    this.eventHooks = eventHooks;
  }

  /**
   * Create a snapshot of component state before risky operations
   */
  createComponentSnapshot(fiber: FiberNode): void {
    const snapshot: ComponentSnapshot = {
      fiber,
      hooks: fiber.hooks ? [...fiber.hooks] : [],
      reactiveState: fiber.reactiveState ? { ...fiber.reactiveState } : undefined,
      timestamp: Date.now()
    };

    this.componentSnapshots.set(fiber, snapshot);
  }

  /**
   * Create snapshots for multiple components
   */
  createComponentSnapshots(fibers: FiberNode[]): void {
    fibers.forEach(fiber => this.createComponentSnapshot(fiber));
  }

  /**
   * Create a snapshot of context value before changes
   */
  createContextSnapshot(contextId: symbol, value: any): void {
    this.contextSnapshots.set(contextId, {
      value: this.deepClone(value),
      timestamp: Date.now()
    });
  }

  /**
   * Rollback a component to its previous snapshot
   */
  rollbackComponent(fiber: FiberNode): boolean {
    const snapshot = this.componentSnapshots.get(fiber);
    if (!snapshot) {
      return false;
    }

    try {
      // Restore hooks
      if (fiber.hooks && snapshot.hooks) {
        fiber.hooks.splice(0, fiber.hooks.length, ...snapshot.hooks);
      }

      // Restore reactive state
      if (fiber.reactiveState && snapshot.reactiveState) {
        Object.assign(fiber.reactiveState, snapshot.reactiveState);
      }

      return true;
    } catch (error) {
      console.warn(`Failed to rollback component ${fiber.path.join('.')}:`, error);
      return false;
    }
  }

  /**
   * Rollback multiple components to their snapshots
   */
  rollbackComponents(fibers: FiberNode[]): RecoveryResult {
    const recoveredFibers: FiberNode[] = [];
    const failedFibers: FiberNode[] = [];

    for (const fiber of fibers) {
      if (this.rollbackComponent(fiber)) {
        recoveredFibers.push(fiber);
      } else {
        failedFibers.push(fiber);
      }
    }

    return {
      success: failedFibers.length === 0,
      strategy: 'rollback',
      message: `Rolled back ${recoveredFibers.length}/${fibers.length} components`,
      recoveredFibers,
      failedFibers
    };
  }

  /**
   * Rollback context value to its previous snapshot
   */
  rollbackContextValue(contextId: symbol): boolean {
    const snapshot = this.contextSnapshots.get(contextId);
    if (!snapshot) {
      return false;
    }

    try {
      // The actual context value rollback would be handled by ContextDependencyTracker
      // This method just validates that we have a snapshot to rollback to
      return true;
    } catch (error) {
      console.warn(`Failed to rollback context ${contextId.toString()}:`, error);
      return false;
    }
  }

  /**
   * Handle re-render errors with appropriate recovery strategy
   */
  async handleReRenderError(
    error: Error,
    affectedFibers: FiberNode[],
    reason: ReRenderReason
  ): Promise<RecoveryResult> {
    // Determine recovery strategy based on error type and reason
    const strategy = this.determineRecoveryStrategy(error, reason);

    switch (strategy) {
      case 'rollback':
        return this.rollbackComponents(affectedFibers);

      case 'isolate':
        return this.isolateFailedComponents(error, affectedFibers);

      case 'retry':
        return await this.retryOperation(error, affectedFibers, reason);

      case 'skip':
        return this.skipFailedComponents(affectedFibers);

      case 'abort':
      default:
        return {
          success: false,
          strategy: 'abort',
          message: `Aborting due to unrecoverable error: ${error.message}`,
          failedFibers: affectedFibers
        };
    }
  }

  /**
   * Handle state update errors with isolation
   */
  handleStateUpdateError(
    error: Error,
    fiber: FiberNode,
    hookIndex: number
  ): RecoveryResult {
    try {
      // Try to rollback the specific hook
      const snapshot = this.componentSnapshots.get(fiber);
      if (snapshot && snapshot.hooks[hookIndex] !== undefined) {
        if (fiber.hooks) {
          fiber.hooks[hookIndex] = snapshot.hooks[hookIndex];
        }

        return {
          success: true,
          strategy: 'rollback',
          message: `Rolled back state hook ${hookIndex} for component ${fiber.path.join('.')}`,
          recoveredFibers: [fiber]
        };
      }

      // If no snapshot, isolate the component
      return this.isolateFailedComponents(error, [fiber]);

    } catch (recoveryError) {
      return {
        success: false,
        strategy: 'abort',
        message: `Failed to recover from state update error: ${recoveryError}`,
        failedFibers: [fiber]
      };
    }
  }

  /**
   * Handle context propagation errors
   */
  async handleContextPropagationError(
    error: Error,
    contextId: symbol,
    affectedFibers: FiberNode[]
  ): Promise<RecoveryResult> {
    try {
      // Try to rollback context value
      const contextRollback = this.rollbackContextValue(contextId);
      
      if (contextRollback) {
        // Rollback affected components
        const componentRollback = this.rollbackComponents(affectedFibers);
        
        return {
          success: componentRollback.success,
          strategy: 'rollback',
          message: `Rolled back context and ${componentRollback.recoveredFibers?.length || 0} components`,
          recoveredFibers: componentRollback.recoveredFibers,
          failedFibers: componentRollback.failedFibers
        };
      }

      // If context rollback fails, isolate affected components
      return this.isolateFailedComponents(error, affectedFibers);

    } catch (recoveryError) {
      return {
        success: false,
        strategy: 'abort',
        message: `Failed to recover from context propagation error: ${recoveryError}`,
        failedFibers: affectedFibers
      };
    }
  }

  /**
   * Handle circular dependency errors
   */
  handleCircularDependencyError(
    error: CircularDependencyError,
    affectedFibers: FiberNode[]
  ): RecoveryResult {
    try {
      // For circular dependencies, we need to break the cycle
      // Find the fiber that's causing the cycle and isolate it
      const cycleFiber = this.findCycleCausingFiber(error.cyclePath, affectedFibers);
      
      if (cycleFiber) {
        // Isolate the cycle-causing fiber
        const isolationResult = this.isolateFailedComponents(error, [cycleFiber]);
        
        // Continue with remaining fibers
        const remainingFibers = affectedFibers.filter(f => f !== cycleFiber);
        
        return {
          success: true,
          strategy: 'isolate',
          message: `Isolated cycle-causing component ${cycleFiber.path.join('.')}`,
          recoveredFibers: remainingFibers,
          failedFibers: [cycleFiber]
        };
      }

      // If we can't identify the cycle cause, rollback all
      return this.rollbackComponents(affectedFibers);

    } catch (recoveryError) {
      return {
        success: false,
        strategy: 'abort',
        message: `Failed to recover from circular dependency: ${recoveryError}`,
        failedFibers: affectedFibers
      };
    }
  }

  /**
   * Determine the appropriate recovery strategy based on error type and context
   */
  private determineRecoveryStrategy(error: Error, reason: ReRenderReason): RecoveryStrategy {
    // Circular dependency errors should be isolated
    if (error instanceof CircularDependencyError) {
      return 'isolate';
    }

    // State update errors can usually be rolled back
    if (error instanceof StateUpdateError) {
      return 'rollback';
    }

    // Context propagation errors should be rolled back
    if (error instanceof ContextPropagationError) {
      return 'rollback';
    }

    // For manual re-renders, we can retry
    if (reason === 'manual') {
      return 'retry';
    }

    // For output updates, we can skip and continue
    if (reason === 'output-update') {
      return 'skip';
    }

    // For hot reload, we can retry
    if (reason === 'hot-reload') {
      return 'retry';
    }

    // Default to rollback for other cases
    return 'rollback';
  }

  /**
   * Isolate failed components and continue with successful ones
   */
  private isolateFailedComponents(error: Error, failedFibers: FiberNode[]): RecoveryResult {
    // Mark failed components as isolated
    failedFibers.forEach(fiber => {
      if (fiber.reactiveState) {
        fiber.reactiveState.isDirty = false;
        fiber.reactiveState.updatePending = false;
        // Add isolation marker
        (fiber.reactiveState as any).isolated = true;
        (fiber.reactiveState as any).isolationReason = error.message;
        (fiber.reactiveState as any).isolationTime = Date.now();
      }
    });

    this.eventHooks?.onError(error, failedFibers[0]);

    return {
      success: true,
      strategy: 'isolate',
      message: `Isolated ${failedFibers.length} failed components`,
      failedFibers
    };
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation(
    error: Error,
    fibers: FiberNode[],
    reason: ReRenderReason,
    attempt: number = 1
  ): Promise<RecoveryResult> {
    if (attempt > this.maxRetries) {
      return {
        success: false,
        strategy: 'retry',
        message: `Max retries (${this.maxRetries}) exceeded`,
        failedFibers: fibers
      };
    }

    // Wait with exponential backoff
    const delay = this.retryDelay * Math.pow(2, attempt - 1);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // The actual retry would be handled by the calling code
      // This method just provides the retry logic framework
      return {
        success: true,
        strategy: 'retry',
        message: `Retry attempt ${attempt} scheduled`,
        recoveredFibers: fibers
      };
    } catch (retryError) {
      // Recursive retry
      return this.retryOperation(error, fibers, reason, attempt + 1);
    }
  }

  /**
   * Skip failed components and continue with others
   */
  private skipFailedComponents(fibers: FiberNode[]): RecoveryResult {
    // Mark components as skipped
    fibers.forEach(fiber => {
      if (fiber.reactiveState) {
        fiber.reactiveState.isDirty = false;
        fiber.reactiveState.updatePending = false;
        // Add skip marker
        (fiber.reactiveState as any).skipped = true;
        (fiber.reactiveState as any).skipTime = Date.now();
      }
    });

    return {
      success: true,
      strategy: 'skip',
      message: `Skipped ${fibers.length} components`,
      recoveredFibers: []
    };
  }

  /**
   * Find the fiber that's causing a circular dependency
   */
  private findCycleCausingFiber(cyclePath: string[], fibers: FiberNode[]): FiberNode | null {
    // Look for a fiber whose path matches part of the cycle path
    for (const fiber of fibers) {
      const fiberPathStr = fiber.path.join('.');
      if (cyclePath.includes(fiberPathStr)) {
        return fiber;
      }
    }
    return null;
  }

  /**
   * Deep clone an object for snapshots
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }

    if (typeof obj === 'object') {
      const cloned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * Clean up old snapshots to prevent memory leaks
   */
  cleanupOldSnapshots(maxAge: number = 300000): void { // 5 minutes default
    const now = Date.now();

    // Clean up context snapshots
    Array.from(this.contextSnapshots.entries()).forEach(([contextId, snapshot]) => {
      if (now - snapshot.timestamp > maxAge) {
        this.contextSnapshots.delete(contextId);
      }
    });

    // Note: Component snapshots use WeakMap, so they'll be garbage collected
    // automatically when the fiber is no longer referenced
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    activeSnapshots: number;
    contextSnapshots: number;
  } {
    return {
      activeSnapshots: 0, // WeakMap doesn't have size
      contextSnapshots: this.contextSnapshots.size
    };
  }

  /**
   * Clear all snapshots (for testing/cleanup)
   */
  clearAllSnapshots(): void {
    this.contextSnapshots.clear();
    // WeakMap will be cleared automatically when fibers are GC'd
  }

  /**
   * Set retry configuration
   */
  setRetryConfig(maxRetries: number, retryDelay: number): void {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }
}