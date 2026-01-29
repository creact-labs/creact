/**
 * Backend interface - abstracts state persistence
 *
 * The Backend enables:
 * - Resume from crash (checkpoint)
 * - Incremental deploys (only changed resources)
 * - State hydration (createStore values restored)
 * - Drift detection (compare expected vs actual)
 */

import type { InstanceNode } from '../primitives/instance.js';

/**
 * Resource deployment state
 */
export type ResourceState = 'pending' | 'applying' | 'deployed' | 'failed';

/**
 * Deployment lifecycle status
 */
export type DeploymentStatus = 'pending' | 'applying' | 'deployed' | 'failed';

/**
 * Change set with deployment ordering
 */
export interface ChangeSet {
  creates: InstanceNode[];
  updates: InstanceNode[];
  deletes: InstanceNode[];
  deploymentOrder: string[];      // Topologically sorted node IDs
  parallelBatches: string[][];    // Groups that can be deployed in parallel
}

/**
 * Serializable node state for persistence
 */
export interface SerializedNode {
  id: string;
  path: string[];
  constructType: string;
  props: Record<string, any>;
  outputs?: Record<string, any>;
  state?: ResourceState;
  store?: any;
}

/**
 * Deployment state - persisted by backend
 */
export interface DeploymentState {
  // All nodes with their serialized state
  nodes: SerializedNode[];

  // Deployment lifecycle
  status: DeploymentStatus;
  checkpoint?: number;        // Resume point (index in deploymentOrder)
  changeSet?: ChangeSet;      // Pending changes

  // Metadata
  stackName: string;
  lastDeployedAt: number;
  user?: string;

  // For createStore hydration
  storeValues?: Record<string, any>;  // path → store state
}

/**
 * Audit log entry for tracking deployment history
 */
export interface AuditLogEntry {
  timestamp: number;
  action: 'deploy_start' | 'deploy_complete' | 'deploy_failed' | 'resource_applied' | 'resource_destroyed';
  nodeId?: string;
  details?: Record<string, any>;
  user?: string;
}

/**
 * Backend interface - implement this to persist deployment state
 *
 * Example implementations:
 * - InMemoryBackend: For testing
 * - FileBackend: Local JSON file
 * - DynamoDBBackend: AWS DynamoDB
 * - S3Backend: AWS S3
 * - PostgresBackend: Database
 */
export interface Backend {
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
  acquireLock?(stackName: string, holder: string, ttlSeconds: number): Promise<boolean>;

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
 * Serialize an InstanceNode for persistence
 */
export function serializeNode(node: InstanceNode): SerializedNode {
  // Extract current output values from signals
  const outputs: Record<string, any> = {};
  for (const [key, [read]] of node.outputSignals) {
    const value = read();
    if (value !== undefined) {
      outputs[key] = value;
    }
  }

  return {
    id: node.id,
    path: node.path,
    constructType: node.constructType,
    props: node.props,
    outputs: Object.keys(outputs).length > 0 ? outputs : undefined,
    store: node.store,
  };
}

/**
 * Serialize multiple nodes
 */
export function serializeNodes(nodes: InstanceNode[]): SerializedNode[] {
  return nodes.map(serializeNode);
}
