// REQ-O01: CloudDOM State Machine
// Transactional deployment engine with crash recovery

import { CloudDOMNode, ChangeSet } from './types';
import { IBackendProvider } from '../providers/IBackendProvider';
import { DeploymentError, DeploymentErrorData } from './errors';

/**
 * DeploymentStatus represents the lifecycle state of a deployment
 *
 * State transitions:
 * - PENDING → APPLYING (deployment starts)
 * - APPLYING → DEPLOYED (deployment succeeds)
 * - APPLYING → FAILED (deployment fails)
 * - APPLYING → ROLLED_BACK (rollback completes)
 *
 * REQ-O01: State machine with crash recovery
 */
export type DeploymentStatus = 'PENDING' | 'APPLYING' | 'DEPLOYED' | 'FAILED' | 'ROLLED_BACK';

/**
 * StateMachineEvent represents events emitted by the state machine
 *
 * Used for observability and telemetry integration.
 */
export type StateMachineEvent = 'started' | 'checkpoint' | 'completed' | 'failed' | 'rolled_back';

/**
 * AuditLogEntry represents an audit trail entry for state changes
 *
 * REQ-O05: Audit log for compliance and debugging
 */
export interface AuditLogEntry {
  /** Timestamp when action occurred (milliseconds since epoch) */
  timestamp: number;

  /** User who initiated the action */
  user: string;

  /** Action performed */
  action: 'start' | 'checkpoint' | 'complete' | 'fail' | 'rollback';

  /** Stack name */
  stackName: string;

  /** Status of the action */
  status: 'completed' | 'failed';

  /** Error message if action failed */
  error?: string;

  /** Change set being applied (optional) */
  changeSet?: ChangeSet;

  /** Checkpoint index (optional) */
  checkpoint?: number;
}

/**
 * DeploymentState represents the complete state of a deployment transaction
 *
 * Stored in BackendProvider for crash recovery and audit trail.
 *
 * REQ-O01: Transactional deployment with checkpoints
 */
export interface DeploymentState {
  /** Current deployment status */
  status: DeploymentStatus;

  /** CloudDOM tree being deployed */
  cloudDOM: CloudDOMNode[];

  /** Change set computed by Reconciler (optional, only during deployment) */
  changeSet?: ChangeSet;

  /** Index of last successfully deployed resource (for crash recovery) */
  checkpoint?: number;

  /** Structured error data (if status is FAILED) */
  error?: DeploymentErrorData;

  /** Timestamp when state was last updated (milliseconds since epoch) */
  timestamp: number;

  /** User who initiated the deployment */
  user: string;

  /** Stack name for this deployment */
  stackName: string;
}

/**
 * StateMachineEventPayload wraps state with event metadata
 *
 * Used for telemetry, metrics, and structured logging.
 */
export interface StateMachineEventPayload {
  /** Event type */
  event: StateMachineEvent;

  /** Current deployment state */
  state: DeploymentState;

  /** Additional metadata (optional) */
  metadata?: Record<string, any>;
}



/**
 * StateMachine manages deployment lifecycle with crash recovery
 *
 * Responsibilities:
 * - Track deployment state transitions
 * - Save checkpoints after each resource deploys
 * - Enable crash recovery (resume or rollback)
 * - Provide atomic state persistence via BackendProvider
 * - Prevent concurrent deployments via locking (REQ-O02)
 * - Emit audit trail for compliance (REQ-O05)
 * - Retry transient backend failures (REQ-O03)
 *
 * Design principles:
 * - All state changes are atomic (saved to BackendProvider immediately)
 * - Checkpoints enable resume from any point
 * - Rollback applies reverse change set
 * - State machine is universal (works with all providers)
 * - Locking prevents race conditions
 * - Audit trail provides compliance and debugging
 *
 * REQ-O01: CloudDOM State Machine
 * REQ-O02: State Locking
 * REQ-O03: Retry Logic
 * REQ-O05: Audit Log
 * REQ-ARCH-01: Provider-Orchestration Separation
 *
 * @example
 * ```typescript
 * const stateMachine = new StateMachine(backendProvider);
 *
 * // Listen to events
 * stateMachine.on('checkpoint', (state) => {
 *   console.log(`Checkpoint: ${state.checkpoint}`);
 * });
 *
 * // Start deployment (acquires lock)
 * await stateMachine.startDeployment('my-stack', changeSet, cloudDOM, 'user@example.com');
 *
 * // Update checkpoint after each resource
 * await stateMachine.updateCheckpoint('my-stack', 0);
 * await stateMachine.updateCheckpoint('my-stack', 1);
 *
 * // Complete deployment (releases lock)
 * await stateMachine.completeDeployment('my-stack');
 *
 * // Or handle failure (releases lock)
 * await stateMachine.failDeployment('my-stack', new DeploymentError('Provider timeout'));
 * ```
 */
export class StateMachine {
  private listeners: Record<StateMachineEvent, ((payload: StateMachineEventPayload) => void)[]> = {
    started: [],
    checkpoint: [],
    completed: [],
    failed: [],
    rolled_back: [],
  };

  /**
   * Map of active lock renewal timers by stack name
   * Used to clean up timers when deployment completes
   */
  private lockRenewalTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Valid state transitions
   *
   * Defines allowed transitions for state machine validation.
   */
  private static readonly VALID_TRANSITIONS: Record<DeploymentStatus, DeploymentStatus[]> = {
    PENDING: ['APPLYING'],
    APPLYING: ['DEPLOYED', 'FAILED', 'ROLLED_BACK'],
    FAILED: ['ROLLED_BACK'],
    DEPLOYED: [],
    ROLLED_BACK: [],
  };

  constructor(
    private backendProvider: IBackendProvider<DeploymentState>,
    private options: {
      /** Number of retries for transient backend failures (default: 3) */
      maxRetries?: number;
      /** Enable audit logging (default: true) */
      enableAuditLog?: boolean;
      /** Enable state snapshots (default: false) */
      enableSnapshots?: boolean;
      /** Lock TTL in seconds (default: 600 = 10 minutes) */
      lockTTL?: number;
    } = {}
  ) {
    this.options = {
      maxRetries: 3,
      enableAuditLog: true,
      enableSnapshots: false,
      lockTTL: 600,
      ...options,
    };
  }

  /**
   * Subscribe to state machine events
   *
   * Enables observability and telemetry integration.
   *
   * @param event - Event type to listen for
   * @param handler - Callback function receiving structured payload
   */
  on(event: StateMachineEvent, handler: (payload: StateMachineEventPayload) => void): void {
    this.listeners[event].push(handler);
  }

  /**
   * Unsubscribe from state machine events
   *
   * @param event - Event type to stop listening for
   * @param handler - Callback function to remove
   */
  off(event: StateMachineEvent, handler: (payload: StateMachineEventPayload) => void): void {
    const index = this.listeners[event].indexOf(handler);
    if (index !== -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners with structured payload
   *
   * @param event - Event type
   * @param state - Current deployment state
   * @param metadata - Additional metadata (optional)
   */
  private emit(
    event: StateMachineEvent,
    state: DeploymentState,
    metadata?: Record<string, any>
  ): void {
    const payload: StateMachineEventPayload = {
      event,
      state,
      metadata,
    };

    for (const handler of this.listeners[event]) {
      try {
        handler(payload);
      } catch (error) {
        // Don't let listener errors break state machine
        console.error(`Error in StateMachine event handler for ${event}:`, error);
      }
    }
  }

  /**
   * Start lock auto-renewal for a stack
   * 
   * Renews the lock at 50% of the TTL interval to prevent expiration
   * during long deployments. Only starts renewal if backend supports locking.
   *
   * @param stackName - Name of the stack
   * @param holder - Lock holder identifier
   * @param ttl - Lock TTL in seconds
   */
  private startLockRenewal(stackName: string, holder: string, ttl: number): void {
    // Only start renewal if backend supports locking
    if (!this.backendProvider.acquireLock) {
      return;
    }

    // Clear any existing timer for this stack
    this.stopLockRenewal(stackName);

    // Renew at 50% of TTL (convert to milliseconds)
    const renewalInterval = (ttl * 1000) / 2;

    const timer = setInterval(async () => {
      try {
        // Renew the lock with the same TTL
        await this.backendProvider.acquireLock!(stackName, holder, ttl);
        console.debug(`[StateMachine] Lock renewed for stack: ${stackName}`);
      } catch (error) {
        console.error(`[StateMachine] Failed to renew lock for ${stackName}:`, error);
        // Stop renewal on failure to prevent spam
        this.stopLockRenewal(stackName);
      }
    }, renewalInterval);

    this.lockRenewalTimers.set(stackName, timer);
    console.debug(`[StateMachine] Lock auto-renewal started for stack: ${stackName} (interval: ${renewalInterval}ms)`);
  }

  /**
   * Stop lock auto-renewal for a stack
   * 
   * Cleans up the renewal timer to prevent memory leaks.
   *
   * @param stackName - Name of the stack
   */
  private stopLockRenewal(stackName: string): void {
    const timer = this.lockRenewalTimers.get(stackName);
    if (timer) {
      clearInterval(timer);
      this.lockRenewalTimers.delete(stackName);
      console.debug(`[StateMachine] Lock auto-renewal stopped for stack: ${stackName}`);
    }
  }

  /**
   * Validate state transition
   *
   * Ensures state machine only transitions through valid states.
   * Prevents accidental invalid state mutations.
   *
   * @param from - Current state
   * @param to - Target state
   * @throws DeploymentError if transition is invalid
   */
  private validateTransition(from: DeploymentStatus, to: DeploymentStatus): void {
    const allowedTransitions = StateMachine.VALID_TRANSITIONS[from];

    if (!allowedTransitions || !allowedTransitions.includes(to)) {
      throw new DeploymentError(`Invalid state transition: ${from} → ${to}`, {
        message: `Invalid state transition: ${from} → ${to}`,
        code: 'INVALID_STATE_TRANSITION',
        details: {
          from,
          to,
          allowedTransitions,
        },
      });
    }
  }

  /**
   * Retry operation with exponential backoff
   *
   * Handles transient backend failures (network issues, timeouts, etc.)
   *
   * REQ-O03: Error handling and retry logic
   *
   * @param operation - Async operation to retry
   * @param retries - Number of retries (default: from options)
   * @returns Promise resolving to operation result
   * @throws Error if all retries fail
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.options.maxRetries ?? 3
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err;

        // Don't retry on final attempt
        if (i < retries - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          const delay = Math.pow(2, i) * 100;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new DeploymentError(
      `Backend operation failed after ${retries} attempts: ${lastError?.message || 'Unknown error'}`,
      {
        message: `Backend operation failed after ${retries} attempts`,
        code: 'BACKEND_OPERATION_FAILED',
        details: { originalError: lastError, retries },
      }
    );
  }

  /**
   * Log action to audit trail
   *
   * REQ-O05: Audit log for compliance
   *
   * @param stackName - Stack name
   * @param action - Action performed
   * @param state - Current deployment state
   * @param error - Error if action failed
   */
  private async logAction(
    stackName: string,
    action: AuditLogEntry['action'],
    state: DeploymentState,
    error?: Error
  ): Promise<void> {
    if (!this.options.enableAuditLog) {
      return;
    }

    if (!this.backendProvider.appendAuditLog) {
      // Backend doesn't support audit logging yet
      return;
    }

    const entry: AuditLogEntry = {
      timestamp: Date.now(),
      user: state.user,
      action,
      stackName,
      status: error ? 'failed' : 'completed',
      error: error?.message,
      changeSet: state.changeSet,
      checkpoint: state.checkpoint,
    };

    try {
      await this.backendProvider.appendAuditLog(stackName, entry);
    } catch (err) {
      // Don't fail deployment if audit logging fails
      console.error(`Failed to append audit log for ${stackName}:`, err);
    }
  }

  /**
   * Save state snapshot for time-travel debugging
   *
   * Creates a deep copy to ensure immutability.
   *
   * REQ-O01: Immutable state snapshots
   *
   * @param stackName - Stack name
   * @param state - Current deployment state
   */
  private async saveSnapshot(stackName: string, state: DeploymentState): Promise<void> {
    if (!this.options.enableSnapshots) {
      return;
    }

    if (!this.backendProvider.saveSnapshot) {
      // Backend doesn't support snapshots yet
      return;
    }

    try {
      // Deep copy to ensure immutability
      const snapshot = JSON.parse(
        JSON.stringify({
          ...state,
          timestamp: Date.now(),
        })
      );

      await this.backendProvider.saveSnapshot(stackName, snapshot);
    } catch (err) {
      // Don't fail deployment if snapshot fails
      console.error(`Failed to save snapshot for ${stackName}:`, err);
    }
  }

  /**
   * Start a deployment transaction
   *
   * Transitions state from PENDING to APPLYING and saves to backend.
   * Acquires lock to prevent concurrent deployments.
   *
   * REQ-O01.1: WHEN deployment starts THEN CloudDOM state SHALL transition to APPLYING
   * REQ-O02: State locking to prevent concurrent deployments
   *
   * @param stackName - Name of the stack being deployed
   * @param changeSet - Change set computed by Reconciler
   * @param cloudDOM - CloudDOM tree being deployed
   * @param user - User initiating the deployment
   * @returns Promise that resolves when state is saved
   * @throws DeploymentError if lock cannot be acquired or state save fails
   */
  async startDeployment(
    stackName: string,
    changeSet: ChangeSet,
    cloudDOM: CloudDOMNode[],
    user: string
  ): Promise<void> {
    // Validate changeSet is not empty
    if (!changeSet.deploymentOrder || changeSet.deploymentOrder.length === 0) {
      throw new DeploymentError(
        `Cannot start deployment: no resources to deploy for stack ${stackName}`,
        {
          message: `Cannot start deployment: no resources to deploy for stack ${stackName}`,
          code: 'EMPTY_CHANGESET',
          details: { stackName, changeSet },
        }
      );
    }

    // Acquire lock to prevent concurrent deployments
    // NOTE: Lock acquisition should NOT be retried - it should fail immediately
    if (this.backendProvider.acquireLock) {
      const lockTTL = this.options.lockTTL ?? 600;
      try {
        await this.backendProvider.acquireLock(stackName, user, lockTTL);
        
        // Start auto-renewal to prevent lock expiration during long deployments
        this.startLockRenewal(stackName, user, lockTTL);
      } catch (error) {
        throw new DeploymentError(
          `Failed to acquire lock for stack ${stackName}. ` +
            `Another deployment may be in progress.`,
          {
            message: `Failed to acquire lock for stack ${stackName}`,
            code: 'LOCK_ACQUISITION_FAILED',
            details: { stackName, user },
            cause: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }

    const state: DeploymentState = {
      status: 'APPLYING',
      cloudDOM,
      changeSet,
      checkpoint: undefined,
      timestamp: Date.now(),
      user,
      stackName,
    };

    try {
      // Validate transition (PENDING → APPLYING)
      // Note: We assume PENDING as initial state for new deployments
      this.validateTransition('PENDING', 'APPLYING');

      // Save state with retry
      await this.withRetry(() => this.backendProvider.saveState(stackName, state));

      // Log action to audit trail
      await this.logAction(stackName, 'start', state);

      // Emit event with metadata
      this.emit('started', state, {
        resourceCount: changeSet.deploymentOrder.length,
        creates: changeSet.creates.length,
        updates: changeSet.updates.length,
        deletes: changeSet.deletes.length,
      });
    } catch (error) {
      // Stop lock renewal and release lock if state save fails
      this.stopLockRenewal(stackName);
      if (this.backendProvider.releaseLock) {
        try {
          await this.backendProvider.releaseLock(stackName);
        } catch (releaseError) {
          console.error(`Failed to release lock after error:`, releaseError);
        }
      }
      throw error;
    }
  }

  /**
   * Update checkpoint after each resource deploys
   *
   * Saves progress to enable crash recovery. If deployment crashes,
   * it can resume from the last checkpoint.
   *
   * REQ-O01.5: WHEN any provider executes THEN StateMachine SHALL checkpoint after each resource
   *
   * @param stackName - Name of the stack being deployed
   * @param checkpoint - Index of last successfully deployed resource
   * @returns Promise that resolves when checkpoint is saved
   * @throws DeploymentError if state is invalid or save fails
   */
  async updateCheckpoint(stackName: string, checkpoint: number): Promise<void> {
    const state = await this.withRetry(() => this.getState(stackName));

    if (!state) {
      throw new DeploymentError(`No deployment state found for stack: ${stackName}`, {
        message: `No deployment state found for stack: ${stackName}`,
        code: 'STATE_NOT_FOUND',
        details: { stackName, checkpoint },
      });
    }

    if (state.status !== 'APPLYING') {
      throw new DeploymentError(
        `Cannot update checkpoint for stack in ${state.status} state. ` +
          `Checkpoints can only be updated during APPLYING state.`,
        {
          message: `Cannot update checkpoint for stack in ${state.status} state`,
          code: 'INVALID_STATE_FOR_CHECKPOINT',
          details: { stackName, currentStatus: state.status, checkpoint },
        }
      );
    }

    // Save snapshot before updating checkpoint (for time-travel debugging)
    await this.saveSnapshot(stackName, state);

    state.checkpoint = checkpoint;
    state.timestamp = Date.now();

    await this.withRetry(() => this.backendProvider.saveState(stackName, state));

    // Log checkpoint to audit trail
    await this.logAction(stackName, 'checkpoint', state);

    // Emit event
    this.emit('checkpoint', state);
  }

  /**
   * Mark deployment as complete
   *
   * Transitions state from APPLYING to DEPLOYED and releases lock.
   *
   * REQ-O01.2: WHEN deployment succeeds THEN state SHALL transition to DEPLOYED
   * REQ-O02: Release lock after deployment completes
   *
   * @param stackName - Name of the stack that was deployed
   * @returns Promise that resolves when state is saved
   * @throws DeploymentError if state is invalid or save fails
   */
  async completeDeployment(stackName: string): Promise<void> {
    const state = await this.withRetry(() => this.getState(stackName));

    if (!state) {
      throw new DeploymentError(`No deployment state found for stack: ${stackName}`, {
        message: `No deployment state found for stack: ${stackName}`,
        code: 'STATE_NOT_FOUND',
        details: { stackName },
      });
    }

    // Validate transition
    this.validateTransition(state.status, 'DEPLOYED');

    // Save snapshot before completing
    await this.saveSnapshot(stackName, state);

    state.status = 'DEPLOYED';
    state.timestamp = Date.now();
    // Clear checkpoint and changeSet after successful deployment
    state.checkpoint = undefined;
    state.changeSet = undefined;

    await this.withRetry(() => this.backendProvider.saveState(stackName, state));

    // Log action to audit trail
    await this.logAction(stackName, 'complete', state);

    // Stop lock renewal and release lock
    this.stopLockRenewal(stackName);
    if (this.backendProvider.releaseLock) {
      try {
        await this.backendProvider.releaseLock(stackName);
      } catch (error) {
        console.error(`Failed to release lock for ${stackName}:`, error);
      }
    }

    // Emit event
    this.emit('completed', state);
  }

  /**
   * Mark deployment as failed
   *
   * Transitions state from APPLYING to FAILED, stores error details, and releases lock.
   *
   * @param stackName - Name of the stack that failed
   * @param error - Error that caused the failure (should be DeploymentError or subclass)
   * @returns Promise that resolves when state is saved
   * @throws DeploymentError if state is invalid or save fails
   */
  async failDeployment(stackName: string, error: Error | DeploymentError): Promise<void> {
    const state = await this.withRetry(() => this.getState(stackName));

    if (!state) {
      throw new DeploymentError(`No deployment state found for stack: ${stackName}`, {
        message: `No deployment state found for stack: ${stackName}`,
        code: 'STATE_NOT_FOUND',
        details: { stackName },
        cause: error.message,
      });
    }

    // Validate transition
    this.validateTransition(state.status, 'FAILED');

    // Save snapshot before failing
    await this.saveSnapshot(stackName, state);

    state.status = 'FAILED';

    // Store structured error data
    if (error instanceof DeploymentError) {
      state.error = error.data;
    } else {
      state.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    state.timestamp = Date.now();

    await this.withRetry(() => this.backendProvider.saveState(stackName, state));

    // Log action to audit trail
    await this.logAction(stackName, 'fail', state, error);

    // Stop lock renewal and release lock
    this.stopLockRenewal(stackName);
    if (this.backendProvider.releaseLock) {
      try {
        await this.backendProvider.releaseLock(stackName);
      } catch (releaseError) {
        console.error(`Failed to release lock for ${stackName}:`, releaseError);
      }
    }

    // Emit event with error metadata
    this.emit('failed', state, {
      errorCode: state.error?.code,
      errorMessage: state.error?.message,
    });
  }

  /**
   * Resume interrupted deployment from checkpoint
   *
   * Returns the change set and checkpoint so deployment can continue
   * from where it left off.
   *
   * REQ-O01.4: WHEN CReact restarts THEN it SHALL detect incomplete transactions
   *            and offer resume/rollback
   *
   * @param stackName - Name of the stack to resume
   * @returns Promise resolving to change set, checkpoint index, and cloudDOM
   * @throws DeploymentError if no incomplete deployment found
   */
  async resumeDeployment(stackName: string): Promise<{
    changeSet: ChangeSet;
    checkpoint: number;
    cloudDOM: CloudDOMNode[];
  }> {
    // Check lock status before resuming
    if (this.backendProvider.checkLock) {
      const lockInfo = await this.backendProvider.checkLock(stackName);
      if (lockInfo) {
        const lockAge = Date.now() - lockInfo.acquiredAt;
        const lockTTL = lockInfo.ttl * 1000; // Convert to milliseconds

        if (lockAge < lockTTL) {
          throw new DeploymentError(`Cannot resume: lock held by ${lockInfo.holder}`, {
            message: `Cannot resume: lock held by ${lockInfo.holder}`,
            code: 'LOCK_HELD',
            details: {
              stackName,
              lockHolder: lockInfo.holder,
              lockAcquiredAt: new Date(lockInfo.acquiredAt).toISOString(),
              lockExpiresAt: new Date(lockInfo.acquiredAt + lockTTL).toISOString(),
            },
          });
        }
      }
    }

    const state = await this.withRetry(() => this.getState(stackName));

    if (!state) {
      throw new DeploymentError(`No deployment state found for stack: ${stackName}`, {
        message: `No deployment state found for stack: ${stackName}`,
        code: 'STATE_NOT_FOUND',
        details: { stackName },
      });
    }

    if (state.status !== 'APPLYING') {
      throw new DeploymentError(
        `Cannot resume deployment for stack in ${state.status} state. ` +
          `Only APPLYING deployments can be resumed.`,
        {
          message: `Cannot resume deployment for stack in ${state.status} state`,
          code: 'INVALID_STATE_FOR_RESUME',
          details: { stackName, currentStatus: state.status },
        }
      );
    }

    if (
      !state.changeSet ||
      !state.changeSet.deploymentOrder ||
      state.changeSet.deploymentOrder.length === 0
    ) {
      throw new DeploymentError(
        `Cannot resume deployment: no change set found in state for stack ${stackName}`,
        {
          message: `Cannot resume deployment: no change set found in state for stack ${stackName}`,
          code: 'MISSING_CHANGESET',
          details: { stackName },
        }
      );
    }

    return {
      changeSet: state.changeSet,
      checkpoint: state.checkpoint ?? -1,
      cloudDOM: state.cloudDOM,
    };
  }

  /**
   * Rollback to previous state
   *
   * Applies reverse change set (deletes → creates, creates → deletes)
   * and transitions state to ROLLED_BACK. Releases lock.
   *
   * Note: This method only updates the state machine status. The actual
   * rollback logic (applying reverse change set) is handled by the caller
   * (typically CReact or CLI).
   *
   * REQ-O01: Crash recovery with rollback
   * REQ-O02: Release lock after rollback
   *
   * @param stackName - Name of the stack to rollback
   * @returns Promise that resolves when state is saved
   * @throws DeploymentError if state is invalid or save fails
   */
  async rollback(stackName: string): Promise<void> {
    const state = await this.withRetry(() => this.getState(stackName));

    if (!state) {
      throw new DeploymentError(`No deployment state found for stack: ${stackName}`, {
        message: `No deployment state found for stack: ${stackName}`,
        code: 'STATE_NOT_FOUND',
        details: { stackName },
      });
    }

    // Validate transition
    this.validateTransition(state.status, 'ROLLED_BACK');

    // Save snapshot before rollback
    await this.saveSnapshot(stackName, state);

    state.status = 'ROLLED_BACK';
    state.timestamp = Date.now();
    // Clear checkpoint and changeSet after rollback
    state.checkpoint = undefined;
    state.changeSet = undefined;

    await this.withRetry(() => this.backendProvider.saveState(stackName, state));

    // Log action to audit trail
    await this.logAction(stackName, 'rollback', state);

    // Stop lock renewal and release lock
    this.stopLockRenewal(stackName);
    if (this.backendProvider.releaseLock) {
      try {
        await this.backendProvider.releaseLock(stackName);
      } catch (error) {
        console.error(`Failed to release lock for ${stackName}:`, error);
      }
    }

    // Emit event
    this.emit('rolled_back', state);
  }

  /**
   * Get current deployment state for a stack
   *
   * @param stackName - Name of the stack
   * @returns Promise resolving to deployment state, or undefined if not found
   */
  async getState(stackName: string): Promise<DeploymentState | undefined> {
    return await this.backendProvider.getState(stackName);
  }

  /**
   * Update the CloudDOM in the deployment state (for post-deployment effects)
   *
   * @param stackName - Stack name
   * @param cloudDOM - Updated CloudDOM with new outputs
   * @throws DeploymentError if state update fails
   */
  async updateCloudDOM(stackName: string, cloudDOM: CloudDOMNode[]): Promise<void> {
    const state = await this.withRetry(() => this.getState(stackName));

    if (!state) {
      throw new DeploymentError(`No deployment state found for stack: ${stackName}`, {
        message: `No deployment state found for stack: ${stackName}`,
        code: 'STATE_NOT_FOUND',
        details: { stackName },
      });
    }

    // Update the CloudDOM in the state
    state.cloudDOM = cloudDOM;
    state.timestamp = Date.now();

    // Save the updated state
    await this.withRetry(() => this.backendProvider.saveState(stackName, state));

    // Log action to audit trail
    await this.logAction(stackName, 'checkpoint', state);
  }

  /**
   * Check if a stack has an incomplete deployment
   *
   * Used on startup to detect crashed deployments that need recovery.
   *
   * REQ-O01.3: WHEN CReact process crashes mid-deploy THEN state SHALL remain in APPLYING
   * REQ-O01.4: WHEN CReact restarts THEN it SHALL detect incomplete transactions
   *
   * @param stackName - Name of the stack to check
   * @returns Promise resolving to true if deployment is incomplete
   */
  async hasIncompleteDeployment(stackName: string): Promise<boolean> {
    const state = await this.getState(stackName);
    return state?.status === 'APPLYING';
  }

  /**
   * Get checkpoint info for display
   *
   * Returns human-readable checkpoint information for CLI/UI.
   * Includes resource ID for better UX.
   *
   * @param stackName - Name of the stack
   * @returns Promise resolving to checkpoint info, or undefined if not found
   */
  async getCheckpointInfo(stackName: string): Promise<
    | {
        checkpoint: number;
        resourceId?: string;
        totalResources: number;
        percentComplete: number;
      }
    | undefined
  > {
    const state = await this.getState(stackName);

    if (!state || !state.changeSet) {
      return undefined;
    }

    const checkpoint = state.checkpoint ?? -1;
    const totalResources = state.changeSet.deploymentOrder.length;
    const percentComplete =
      totalResources > 0 ? Math.round(((checkpoint + 1) / totalResources) * 100) : 0;

    // Get resource ID at checkpoint for better CLI UX
    const resourceId =
      checkpoint >= 0 && checkpoint < state.changeSet.deploymentOrder.length
        ? state.changeSet.deploymentOrder[checkpoint]
        : undefined;

    return {
      checkpoint,
      resourceId,
      totalResources,
      percentComplete,
    };
  }

  /**
   * Auto-recover from incomplete deployment
   *
   * Convenience method for CLI/orchestrator to automatically resume or rollback
   * based on configuration.
   *
   * @param stackName - Name of the stack to recover
   * @param strategy - Recovery strategy ('resume' or 'rollback')
   * @returns Promise resolving to recovery info, or undefined if no recovery needed
   */
  async autoRecover(
    stackName: string,
    strategy: 'resume' | 'rollback'
  ): Promise<{
    action: 'resumed' | 'rolled_back' | 'none';
    checkpoint?: number;
    changeSet?: ChangeSet;
    cloudDOM?: CloudDOMNode[];
  }> {
    if (!(await this.hasIncompleteDeployment(stackName))) {
      return { action: 'none' };
    }

    if (strategy === 'resume') {
      const { changeSet, checkpoint, cloudDOM } = await this.resumeDeployment(stackName);
      return {
        action: 'resumed',
        checkpoint,
        changeSet,
        cloudDOM,
      };
    } else {
      await this.rollback(stackName);
      return { action: 'rolled_back' };
    }
  }
}
