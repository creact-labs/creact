/**
 * StateMachine - Resource lifecycle tracking and deployment orchestration
 *
 * Tracks:
 * - Individual resource states (pending → applying → deployed)
 * - Deployment lifecycle (start → checkpoint → complete/fail)
 * - Resume capability from crash
 */

import type {
  Backend,
  DeploymentState,
  ChangeSet,
  ResourceState,
  SerializedNode,
  AuditLogEntry,
} from '../provider/backend.js';

export interface StateMachineOptions {
  user?: string;
  enableAuditLog?: boolean;
}

/**
 * StateMachine manages deployment lifecycle and resource states
 */
export class StateMachine {
  private resourceStates = new Map<string, ResourceState>();
  private options: StateMachineOptions;

  constructor(
    private backend: Backend,
    options: StateMachineOptions = {}
  ) {
    this.options = options;
  }

  /**
   * Get the current state of a resource
   */
  getResourceState(nodeId: string): ResourceState {
    return this.resourceStates.get(nodeId) ?? 'pending';
  }

  /**
   * Set the state of a resource
   */
  setResourceState(nodeId: string, state: ResourceState): void {
    this.resourceStates.set(nodeId, state);
  }

  /**
   * Restore resource states from persisted nodes
   */
  restoreResourceStates(nodes: SerializedNode[]): void {
    this.resourceStates.clear();
    for (const node of nodes) {
      // If node has outputs, it was previously deployed
      const state = node.state ?? (node.outputs ? 'deployed' : 'pending');
      this.resourceStates.set(node.id, state);
    }
  }

  /**
   * Clear all resource states
   */
  clearResourceStates(): void {
    this.resourceStates.clear();
  }

  /**
   * Start a new deployment
   */
  async startDeployment(
    stackName: string,
    changeSet: ChangeSet,
    nodes: SerializedNode[]
  ): Promise<void> {
    const state: DeploymentState = {
      nodes,
      status: 'applying',
      changeSet,
      checkpoint: -1,
      stackName,
      lastDeployedAt: Date.now(),
      user: this.options.user,
    };

    await this.backend.saveState(stackName, state);

    if (this.options.enableAuditLog && this.backend.appendAuditLog) {
      await this.backend.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action: 'deploy_start',
        user: this.options.user,
        details: {
          creates: changeSet.creates.length,
          updates: changeSet.updates.length,
          deletes: changeSet.deletes.length,
        },
      });
    }
  }

  /**
   * Update checkpoint during deployment (for crash recovery)
   */
  async updateCheckpoint(stackName: string, index: number): Promise<void> {
    const state = await this.backend.getState(stackName);
    if (state) {
      state.checkpoint = index;
      await this.backend.saveState(stackName, state);
    }
  }

  /**
   * Record a resource being applied
   */
  async recordResourceApplied(
    stackName: string,
    nodeId: string,
    outputs: Record<string, any>
  ): Promise<void> {
    this.setResourceState(nodeId, 'deployed');

    if (this.options.enableAuditLog && this.backend.appendAuditLog) {
      await this.backend.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action: 'resource_applied',
        nodeId,
        user: this.options.user,
        details: { outputKeys: Object.keys(outputs) },
      });
    }
  }

  /**
   * Record a resource being destroyed
   */
  async recordResourceDestroyed(stackName: string, nodeId: string): Promise<void> {
    this.resourceStates.delete(nodeId);

    if (this.options.enableAuditLog && this.backend.appendAuditLog) {
      await this.backend.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action: 'resource_destroyed',
        nodeId,
        user: this.options.user,
      });
    }
  }

  /**
   * Complete a successful deployment
   */
  async completeDeployment(stackName: string, nodes: SerializedNode[]): Promise<void> {
    const state: DeploymentState = {
      nodes,
      status: 'deployed',
      checkpoint: undefined,
      changeSet: undefined,
      stackName,
      lastDeployedAt: Date.now(),
      user: this.options.user,
    };

    await this.backend.saveState(stackName, state);

    if (this.options.enableAuditLog && this.backend.appendAuditLog) {
      await this.backend.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action: 'deploy_complete',
        user: this.options.user,
        details: { nodeCount: nodes.length },
      });
    }
  }

  /**
   * Record a failed deployment
   */
  async failDeployment(stackName: string, error: Error): Promise<void> {
    const state = await this.backend.getState(stackName);
    if (state) {
      state.status = 'failed';
      await this.backend.saveState(stackName, state);
    }

    if (this.options.enableAuditLog && this.backend.appendAuditLog) {
      await this.backend.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action: 'deploy_failed',
        user: this.options.user,
        details: { error: error.message },
      });
    }
  }

  /**
   * Check if a deployment can be resumed
   */
  async canResume(stackName: string): Promise<boolean> {
    const state = await this.backend.getState(stackName);
    return state?.status === 'applying' && state.checkpoint !== undefined;
  }

  /**
   * Get resume point for a failed deployment
   */
  async getResumePoint(
    stackName: string
  ): Promise<{ checkpoint: number; changeSet: ChangeSet } | null> {
    const state = await this.backend.getState(stackName);
    if (state?.status === 'applying' && state.changeSet && state.checkpoint !== undefined) {
      return { checkpoint: state.checkpoint, changeSet: state.changeSet };
    }
    return null;
  }

  /**
   * Get previous deployment state
   */
  async getPreviousState(stackName: string): Promise<DeploymentState | null> {
    return this.backend.getState(stackName);
  }

  /**
   * Acquire deployment lock (if backend supports it)
   */
  async acquireLock(stackName: string, holder: string, ttlSeconds: number = 300): Promise<boolean> {
    if (this.backend.acquireLock) {
      return this.backend.acquireLock(stackName, holder, ttlSeconds);
    }
    return true; // No locking support, allow
  }

  /**
   * Release deployment lock (if backend supports it)
   */
  async releaseLock(stackName: string): Promise<void> {
    if (this.backend.releaseLock) {
      await this.backend.releaseLock(stackName);
    }
  }
}
