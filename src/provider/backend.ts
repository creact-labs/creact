/**
 * Backend interface - abstracts state persistence
 *
 * The Backend enables:
 * - Resume from crash (nodes with outputs are treated as deployed)
 * - Incremental deploys (only changed resources)
 * - State hydration (createStore values restored)
 * - Drift detection (compare expected vs actual)
 */

import type { InstanceNode } from '../primitives/instance';

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
  deploymentOrder: string[]; // Topologically sorted node IDs
  parallelBatches: string[][]; // Groups that can be deployed in parallel
}

/**
 * Serializable node state for persistence
 */
export interface SerializedNode {
  id: string;
  path: string[];
  constructType: string;
  // biome-ignore lint/suspicious/noExplicitAny: props are user-defined with arbitrary types
  props: Record<string, any>;
  // biome-ignore lint/suspicious/noExplicitAny: outputs are provider-returned with arbitrary types
  outputs?: Record<string, any>;
  state?: ResourceState;
  // biome-ignore lint/suspicious/noExplicitAny: store contains user-defined state
  store?: any;
}

/**
 * Deployment state - persisted by backend
 */
export interface DeploymentState {
  // All nodes with their serialized state (outputs updated as nodes complete)
  nodes: SerializedNode[];

  // Deployment lifecycle
  status: DeploymentStatus;
  applyingNodeId?: string; // Node currently being applied (for crash recovery)

  // Metadata
  stackName: string;
  lastDeployedAt: number;
  user?: string;

  // For createStore hydration
  // biome-ignore lint/suspicious/noExplicitAny: store values are user-defined with arbitrary types
  storeValues?: Record<string, any>; // path → store state
}

/**
 * Audit log entry for tracking deployment history
 */
export interface AuditLogEntry {
  timestamp: number;
  action:
    | 'deploy_start'
    | 'deploy_complete'
    | 'deploy_failed'
    | 'resource_applied'
    | 'resource_destroyed';
  nodeId?: string;
  // biome-ignore lint/suspicious/noExplicitAny: audit log details can contain arbitrary data
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
  // biome-ignore lint/suspicious/noExplicitAny: outputs are provider-returned with arbitrary types
  const outputs: Record<string, any> = {};
  for (const [key, [read]] of node.outputSignals) {
    const value = read();
    if (value !== undefined) {
      // Guard: Detect corrupted outputs (e.g., id should be string, not array)
      if (key === 'id' && typeof value !== 'string') {
        console.error(`[serializeNode] CORRUPTION DETECTED:`);
        console.error(`  node.id: ${node.id}`);
        console.error(`  node.constructType: ${node.constructType}`);
        console.error(`  signal keys: [${Array.from(node.outputSignals.keys()).join(', ')}]`);
        console.error(`  corrupted 'id' value type: ${Array.isArray(value) ? 'array' : typeof value}`);
        console.error(`  corrupted 'id' value preview: ${JSON.stringify(value).slice(0, 300)}`);
        throw new Error(
          `[serializeNode] Corrupted output detected for ${node.id}: ` +
          `'id' should be string but got ${Array.isArray(value) ? 'array' : typeof value}. ` +
          `This indicates a signal/proxy bug where outputs are being read from wrong node.`
        );
      }
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
