/**
 * Memory interface - abstracts state persistence
 *
 * The Memory enables:
 * - Resume from crash (nodes with outputs are treated as deployed)
 * - Incremental deploys (only changed resources)
 * - State hydration (createStore values restored)
 * - Drift detection (compare expected vs actual)
 */

import type { InstanceNode } from "./instance";

/**
 * Resource deployment state
 */
export type ResourceState = "pending" | "applying" | "deployed" | "failed";

/**
 * Deployment lifecycle status
 */
export type DeploymentStatus = "pending" | "applying" | "deployed" | "failed";

/**
 * Serializable node state for persistence
 */
export interface SerializedNode {
  id: string;
  path: string[];
  props: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  state?: ResourceState;
  store?: object;
}

/**
 * Deployment state - persisted by memory
 */
export interface DeploymentState {
  // All nodes with their serialized state (outputs updated as nodes complete)
  nodes: SerializedNode[];

  // Deployment lifecycle
  status: DeploymentStatus;
  applyingNodeIds?: string[]; // Nodes currently being applied (for crash recovery)

  // Metadata
  stackName: string;
  lastDeployedAt: number;
  user?: string;
}

/**
 * Audit log entry for tracking deployment history
 */
export interface AuditLogEntry {
  timestamp: number;
  action:
    | "deploy_start"
    | "deploy_complete"
    | "deploy_failed"
    | "resource_applied"
    | "resource_destroyed";
  nodeId?: string;
  details?: Record<string, unknown>;
  user?: string;
}

/**
 * Memory interface - implement this to persist deployment state
 *
 * Example implementations:
 * - InMemoryMemory: For testing
 * - FileMemory: Local JSON file
 * - DynamoDBMemory: AWS DynamoDB
 * - S3Memory: AWS S3
 * - PostgresMemory: Database
 */
export interface Memory {
  /**
   * Get current deployment state for a stack
   */
  getState(stackName: string): Promise<DeploymentState | null>;

  /**
   * Save deployment state
   */
  saveState(stackName: string, state: DeploymentState): Promise<void>;

  /**
   * Optional: Acquire lock for concurrent deploy protection
   * @param stackName - Stack to lock
   * @param holder - Identity of lock holder (e.g., deployment ID)
   * @param ttlSeconds - Lock TTL in seconds
   * @returns true if lock acquired, false if already locked
   */
  acquireLock?(
    stackName: string,
    holder: string,
    ttlSeconds: number,
  ): Promise<boolean>;

  /**
   * Optional: Renew a held deployment lock before its TTL expires
   * @param holder - Must match the current lock holder
   * @returns true if the lease was extended, false if the lock was lost
   */
  renewLock?(
    stackName: string,
    holder: string,
    ttlSeconds: number,
  ): Promise<boolean>;

  /**
   * Optional: Release deployment lock
   */
  releaseLock?(stackName: string): Promise<void>;

  /**
   * Optional: Append to audit trail
   */
  appendAuditLog?(stackName: string, entry: AuditLogEntry): Promise<void>;

  /**
   * Optional: Get audit log entries
   */
  getAuditLog?(stackName: string, limit?: number): Promise<AuditLogEntry[]>;
}

/**
 * Guard: detect corrupted outputs (e.g. `id` should be string, not array) —
 * indicates a signal/proxy bug where outputs are read from the wrong node
 */
function assertOutputIntegrity(node: InstanceNode, key: string, value: unknown) {
  if (key !== "id" || typeof value === "string") return;

  const valueType = Array.isArray(value) ? "array" : typeof value;
  console.error(`[serializeNode] CORRUPTION DETECTED:`);
  console.error(`  node.id: ${node.id}`);
  console.error(
    `  signal keys: [${Array.from(node.outputSignals.keys()).join(", ")}]`,
  );
  console.error(`  corrupted 'id' value type: ${valueType}`);
  console.error(
    `  corrupted 'id' value preview: ${JSON.stringify(value).slice(0, 300)}`,
  );
  throw new Error(
    `[serializeNode] Corrupted output detected for ${node.id}: ` +
      `'id' should be string but got ${valueType}. ` +
      `This indicates a signal/proxy bug where outputs are being read from wrong node.`,
  );
}

/**
 * Serialize an InstanceNode for persistence
 */
export function serializeNode(node: InstanceNode): SerializedNode {
  // Extract current output values from signals
  const outputs: Record<string, unknown> = {};
  for (const [key, [read]] of node.outputSignals) {
    const value = read();
    if (value !== undefined) {
      assertOutputIntegrity(node, key, value);
      outputs[key] = value;
    }
  }

  return {
    id: node.id,
    path: node.path,
    props: node.props,
    outputs: Object.keys(outputs).length > 0 ? outputs : undefined,
    store: node.store,
  };
}

/**
 * Serialize multiple nodes for a deployment snapshot.
 *
 * Best-effort per node: one corrupted node must not abort the whole
 * snapshot (losing every other node's outputs on crash). A node that
 * fails to serialize is persisted without outputs — its handler simply
 * re-runs fresh on the next boot — and the corruption is reported.
 */
export function serializeNodes(nodes: InstanceNode[]): SerializedNode[] {
  return nodes.map((node) => {
    try {
      return serializeNode(node);
    } catch (err) {
      console.error(
        `[CReact] Persisting node "${node.id}" without outputs — serialization failed:`,
        err,
      );
      return {
        id: node.id,
        path: node.path,
        props: node.props,
        outputs: undefined,
        store: node.store,
      };
    }
  });
}
