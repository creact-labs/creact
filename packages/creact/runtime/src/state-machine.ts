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
  DeploymentState,
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
      // If node has outputs, it was previously deployed
      const state = node.state ?? (node.outputs ? "deployed" : "pending");
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
    const mutex = this.getMutex(stackName);
    await mutex.runExclusive(async () => {
      const state: DeploymentState = {
        nodes,
        status: "applying",
        stackName,
        lastDeployedAt: Date.now(),
        user: this.options.user,
      };

      await this.memory.saveState(stackName, state);
    });

    if (this.options.enableAuditLog && this.memory.appendAuditLog) {
      await this.memory.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action: "deploy_start",
        user: this.options.user,
        details: changeStats,
      });
    }
  }

  /**
   * Update a node's outputs in persisted state (for crash recovery)
   * This is the real checkpoint - nodes with outputs are considered deployed
   */
  async updateNodeOutputs(
    stackName: string,
    nodeId: string,
    outputs: Record<string, any>,
  ): Promise<void> {
    const mutex = this.getMutex(stackName);
    await mutex.runExclusive(async () => {
      const state = await this.memory.getState(stackName);
      if (state) {
        const node = state.nodes.find((n) => n.id === nodeId);
        if (node) {
          node.outputs = outputs;
          await this.memory.saveState(stackName, state);
        }
      }
    });
  }

  /**
   * Mark a node as currently being applied (for crash recovery)
   */
  async markApplying(stackName: string, nodeId: string): Promise<void> {
    const mutex = this.getMutex(stackName);
    await mutex.runExclusive(async () => {
      const state = await this.memory.getState(stackName);
      if (state) {
        state.applyingNodeId = nodeId;
        await this.memory.saveState(stackName, state);
      }
    });
  }

  /**
   * Clear the applying marker after successful apply
   */
  async clearApplying(stackName: string): Promise<void> {
    const mutex = this.getMutex(stackName);
    await mutex.runExclusive(async () => {
      const state = await this.memory.getState(stackName);
      if (state) {
        state.applyingNodeId = undefined;
        await this.memory.saveState(stackName, state);
      }
    });
  }

  /**
   * Record a resource being applied
   */
  async recordResourceApplied(
    stackName: string,
    nodeId: string,
    outputs: Record<string, any>,
  ): Promise<void> {
    this.setResourceState(nodeId, "deployed");

    if (this.options.enableAuditLog && this.memory.appendAuditLog) {
      await this.memory.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action: "resource_applied",
        nodeId,
        user: this.options.user,
        details: { outputKeys: Object.keys(outputs) },
      });
    }
  }

  /**
   * Record a resource being destroyed
   */
  async recordResourceDestroyed(
    stackName: string,
    nodeId: string,
  ): Promise<void> {
    this.resourceStates.delete(nodeId);

    if (this.options.enableAuditLog && this.memory.appendAuditLog) {
      await this.memory.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action: "resource_destroyed",
        nodeId,
        user: this.options.user,
      });
    }
  }

  /**
   * Complete a successful deployment
   */
  async completeDeployment(
    stackName: string,
    nodes: SerializedNode[],
  ): Promise<void> {
    const mutex = this.getMutex(stackName);
    await mutex.runExclusive(async () => {
      const state: DeploymentState = {
        nodes,
        status: "deployed",
        stackName,
        lastDeployedAt: Date.now(),
        user: this.options.user,
      };

      await this.memory.saveState(stackName, state);
    });

    if (this.options.enableAuditLog && this.memory.appendAuditLog) {
      await this.memory.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action: "deploy_complete",
        user: this.options.user,
        details: { nodeCount: nodes.length },
      });
    }
  }

  /**
   * Record a failed deployment
   */
  async failDeployment(stackName: string, error: Error): Promise<void> {
    const mutex = this.getMutex(stackName);
    await mutex.runExclusive(async () => {
      const state = await this.memory.getState(stackName);
      if (state) {
        state.status = "failed";
        await this.memory.saveState(stackName, state);
      }
    });

    if (this.options.enableAuditLog && this.memory.appendAuditLog) {
      await this.memory.appendAuditLog(stackName, {
        timestamp: Date.now(),
        action: "deploy_failed",
        user: this.options.user,
        details: { error: error.message },
      });
    }
  }

  /**
   * Check if a deployment can be resumed
   */
  async canResume(stackName: string): Promise<boolean> {
    const state = await this.memory.getState(stackName);
    return state?.status === "applying";
  }

  /**
   * Get the node that was being applied when crash occurred
   */
  async getInterruptedNodeId(stackName: string): Promise<string | null> {
    const state = await this.memory.getState(stackName);
    return state?.applyingNodeId ?? null;
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
