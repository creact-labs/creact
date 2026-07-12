/**
 * StateMachine - Resource lifecycle tracking and deployment orchestration
 *
 * Tracks:
 * - Individual resource states (pending → applying → deployed)
 * - Deployment lifecycle (start → checkpoint → complete/fail)
 * - Resume capability from crash
 */

import { AsyncMutex } from "./async-mutex";
import type {
  AuditLogEntry,
  DeploymentState,
  DeploymentStatus,
  Memory,
  ResourceState,
  SerializedNode,
} from "./memory";

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
  private stackMutexes = new Map<string, AsyncMutex>();

  constructor(
    private memory: Memory,
    options: StateMachineOptions = {},
  ) {
    this.options = options;
  }

  /**
   * Get or create a mutex for a specific stack
   */
  private getMutex(stackName: string): AsyncMutex {
    let mutex = this.stackMutexes.get(stackName);
    if (!mutex) {
      mutex = new AsyncMutex();
      this.stackMutexes.set(stackName, mutex);
    }
    return mutex;
  }

  /**
   * Persist a full deployment snapshot with the given status (mutex-guarded)
   */
  private async saveSnapshot(
    stackName: string,
    nodes: SerializedNode[],
    status: DeploymentStatus,
  ): Promise<void> {
    await this.getMutex(stackName).runExclusive(async () => {
      const state: DeploymentState = {
        nodes,
        status,
        stackName,
        lastDeployedAt: Date.now(),
        user: this.options.user,
      };
      await this.memory.saveState(stackName, state);
    });
  }

  /**
   * Load-mutate-save the persisted state under the stack mutex.
   * No-op when no state exists yet.
   */
  private async mutateState(
    stackName: string,
    mutate: (state: DeploymentState) => void,
  ): Promise<void> {
    await this.getMutex(stackName).runExclusive(async () => {
      const state = await this.memory.getState(stackName);
      if (state) {
        mutate(state);
        await this.memory.saveState(stackName, state);
      }
    });
  }

  /**
   * Append an audit entry when audit logging is enabled
   */
  private async audit(
    stackName: string,
    action: AuditLogEntry["action"],
    extra: Partial<AuditLogEntry> = {},
  ): Promise<void> {
    if (this.options.enableAuditLog && this.memory.appendAuditLog) {
      await this.memory.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action,
        user: this.options.user,
        ...extra,
      });
    }
  }

  /**
   * Get the current state of a resource
   */
  getResourceState(nodeId: string): ResourceState {
    return this.resourceStates.get(nodeId) ?? "pending";
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
      // If node has non-empty outputs, it was previously deployed
      const wasDeployed =
        node.outputs && Object.keys(node.outputs).length > 0;
      const state = node.state ?? (wasDeployed ? "deployed" : "pending");
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
    nodes: SerializedNode[],
    changeStats?: {
      creates: number;
      updates: number;
      deletes: number;
      resumed?: number;
    },
  ): Promise<void> {
    await this.saveSnapshot(stackName, nodes, "applying");
    await this.audit(stackName, "deploy_start", { details: changeStats });
  }

  /**
   * Update a node's outputs in persisted state (for crash recovery)
   * This is the real checkpoint - nodes with outputs are considered deployed
   */
  async updateNodeOutputs(
    stackName: string,
    nodeId: string,
    outputs: Record<string, unknown>,
  ): Promise<void> {
    await this.mutateState(stackName, (state) => {
      const node = state.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.outputs = outputs;
      }
    });
  }

  /**
   * Replace the persisted node list mid-deployment (eager cascade),
   * preserving deployment status and the in-flight applying set.
   * Ensures nodes born mid-cascade are checkpointable by updateNodeOutputs.
   */
  async syncNodes(stackName: string, nodes: SerializedNode[]): Promise<void> {
    await this.mutateState(stackName, (state) => {
      // Keep outputs already checkpointed for nodes the new snapshot lacks
      const persisted = new Map(state.nodes.map((n) => [n.id, n]));
      state.nodes = nodes.map((n) => {
        if (n.outputs) return n;
        const prev = persisted.get(n.id);
        return prev?.outputs ? { ...n, outputs: prev.outputs } : n;
      });
    });
  }

  /**
   * Add a node to the in-flight applying set (for crash recovery)
   */
  async addApplying(stackName: string, nodeId: string): Promise<void> {
    await this.mutateState(stackName, (state) => {
      if (!state.applyingNodeIds) state.applyingNodeIds = [];
      if (!state.applyingNodeIds.includes(nodeId)) {
        state.applyingNodeIds.push(nodeId);
      }
    });
  }

  /**
   * Remove a node from the in-flight applying set after successful apply
   */
  async removeApplying(stackName: string, nodeId: string): Promise<void> {
    await this.mutateState(stackName, (state) => {
      if (state.applyingNodeIds) {
        state.applyingNodeIds = state.applyingNodeIds.filter(
          (id) => id !== nodeId,
        );
        if (state.applyingNodeIds.length === 0) {
          state.applyingNodeIds = undefined;
        }
      }
    });
  }

  /**
   * Record a resource being applied
   */
  async recordResourceApplied(
    stackName: string,
    nodeId: string,
    outputs: Record<string, unknown>,
  ): Promise<void> {
    this.setResourceState(nodeId, "deployed");
    await this.audit(stackName, "resource_applied", {
      nodeId,
      details: { outputKeys: Object.keys(outputs) },
    });
  }

  /**
   * Record a resource being destroyed
   */
  async recordResourceDestroyed(
    stackName: string,
    nodeId: string,
  ): Promise<void> {
    this.resourceStates.delete(nodeId);
    await this.audit(stackName, "resource_destroyed", { nodeId });
  }

  /**
   * Complete a successful deployment
   */
  async completeDeployment(
    stackName: string,
    nodes: SerializedNode[],
  ): Promise<void> {
    await this.saveSnapshot(stackName, nodes, "deployed");
    await this.audit(stackName, "deploy_complete", {
      details: { nodeCount: nodes.length },
    });
  }

  /**
   * Record a failed deployment
   */
  async failDeployment(stackName: string, error: Error): Promise<void> {
    await this.mutateState(stackName, (state) => {
      state.status = "failed";
    });
    await this.audit(stackName, "deploy_failed", {
      details: { error: error.message },
    });
  }

  /**
   * Check if a deployment can be resumed
   */
  async canResume(stackName: string): Promise<boolean> {
    const state = await this.memory.getState(stackName);
    return state?.status === "applying";
  }

  /**
   * Get the nodes that were being applied when crash occurred
   */
  async getInterruptedNodeIds(stackName: string): Promise<string[]> {
    const state = await this.memory.getState(stackName);
    return state?.applyingNodeIds ?? [];
  }

  /**
   * Get previous deployment state
   */
  async getPreviousState(stackName: string): Promise<DeploymentState | null> {
    return this.memory.getState(stackName);
  }

  /**
   * Acquire deployment lock (if backend supports it)
   */
  async acquireLock(
    stackName: string,
    holder: string,
    ttlSeconds: number = 300,
  ): Promise<boolean> {
    if (this.memory.acquireLock) {
      return this.memory.acquireLock(stackName, holder, ttlSeconds);
    }
    return true; // No locking support, allow
  }

  /**
   * Release deployment lock (if backend supports it)
   */
  async releaseLock(stackName: string): Promise<void> {
    if (this.memory.releaseLock) {
      await this.memory.releaseLock(stackName);
    }
  }
}
