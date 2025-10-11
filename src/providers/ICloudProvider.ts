
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

// REQ-04: Provider interfaces for dependency injection
// REQ-09: Lifecycle hooks for observability and error handling

// Import CloudDOMNode from core types to avoid duplication
import { CloudDOMNode } from '../core/types';

/**
 * OutputChangeEvent represents a provider output change notification
 * Emitted when a resource's outputs become available or change
 */
export interface OutputChangeEvent {
  /** CloudDOM node ID that changed */
  nodeId: string;

  /** New output values */
  outputs: Record<string, any>;

  /** Timestamp of the change */
  timestamp: number;
}

/**
 * DriftDetectionResult represents the result of checking if a resource has drifted
 */
export interface DriftDetectionResult {
  /** Resource ID that was checked */
  nodeId: string;

  /** Whether the resource has drifted from expected state */
  hasDrifted: boolean;

  /** Expected state from CloudDOM */
  expectedState?: Record<string, any>;

  /** Actual state from cloud provider */
  actualState?: Record<string, any>;

  /** Human-readable description of the drift */
  driftDescription?: string;

  /** Timestamp of the check */
  timestamp: number;
}

/**
 * ICloudProvider defines the interface for cloud infrastructure providers.
 * Implementations materialize CloudDOM trees into actual cloud resources.
 *
 * This interface supports dependency injection, allowing different providers
 * (e.g., DummyCloudProvider for testing, CDKTFProvider for production) to be
 * swapped without changing core CReact logic.
 *
 * @example
 * ```typescript
 * class DummyCloudProvider implements ICloudProvider {
 *   async initialize() {
 *     console.log('Provider initialized');
 *   }
 *
 *   materialize(cloudDOM: CloudDOMNode[], scope: any): void {
 *     console.log('Materializing:', cloudDOM);
 *   }
 * }
 * ```
 */
export interface ICloudProvider {
  /**
   * Optional async initialization for remote connections (AWS, Vault, etc.)
   * Called before any other provider methods.
   *
   * REQ-04.4: Support async initialization for providers that need to
   * establish remote connections or load configuration.
   *
   * @returns Promise that resolves when initialization is complete
   */
  initialize?(): Promise<void>;

  /**
   * Materialize CloudDOM tree into actual cloud resources.
   * This is the core method that deploys infrastructure.
   *
   * REQ-04: Core provider interface for cloud resource creation
   *
   * @param cloudDOM - Array of CloudDOM nodes to materialize
   * @param scope - Optional provider-specific scope object (e.g., CDKTF App)
   */
  materialize(cloudDOM: CloudDOMNode[], scope?: any): void;

  /**
   * Optional lifecycle hook called before deployment begins.
   * Use for validation, logging, or pre-deployment checks.
   *
   * REQ-09.1: preDeploy lifecycle hook for auditing and validation
   *
   * @param cloudDOM - CloudDOM tree about to be deployed
   * @returns Promise that resolves when pre-deployment tasks complete
   * @throws Error if pre-deployment checks fail (halts deployment)
   */
  preDeploy?(cloudDOM: CloudDOMNode[]): Promise<void>;

  /**
   * Optional lifecycle hook called after successful deployment.
   * Use for logging, metrics collection, or post-deployment actions.
   *
   * REQ-09.2: postDeploy lifecycle hook for observability
   *
   * @param cloudDOM - CloudDOM tree that was deployed
   * @param outputs - Collected outputs from deployed resources
   * @returns Promise that resolves when post-deployment tasks complete
   */
  postDeploy?(cloudDOM: CloudDOMNode[], outputs: Record<string, any>): Promise<void>;

  /**
   * Optional lifecycle hook called when deployment fails.
   * Use for error logging, cleanup, or alerting.
   *
   * REQ-09.3: onError lifecycle hook for error handling
   *
   * @param error - Error that caused deployment to fail
   * @param cloudDOM - CloudDOM tree that failed to deploy
   * @returns Promise that resolves when error handling completes
   */
  onError?(error: Error, cloudDOM: CloudDOMNode[]): Promise<void>;

  /**
   * Subscribe to output change events (optional - for event-driven reactivity)
   * Providers can emit events when resource outputs become available
   *
   * This enables real-time reactivity without polling:
   * - Provider emits when outputs are ready
   * - Orchestrator subscribes and triggers re-renders
   * - useEffect callbacks can react to specific output changes
   *
   * @param event - Event type to subscribe to
   * @param handler - Callback function to handle the event
   */
  on?(event: 'outputsChanged', handler: (change: OutputChangeEvent) => void): void;

  /**
   * Unsubscribe from output change events
   *
   * @param event - Event type to unsubscribe from
   * @param handler - Callback function to remove
   */
  off?(event: 'outputsChanged', handler: (change: OutputChangeEvent) => void): void;

  /**
   * Emit output change event (used by provider implementations)
   * Internal method for providers to notify subscribers
   *
   * @param event - Event type
   * @param change - Output change details
   */
  emit?(event: 'outputsChanged', change: OutputChangeEvent): void;

  /**
   * Detect drift for a specific resource (REQUIRED)
   * 
   * Compares the expected state (from CloudDOM) with the actual state
   * (from the cloud provider) to detect if the resource has drifted.
   * 
   * This is called by CReact automatically during:
   * - Every state load (to detect stale state)
   * - Plan command (to show drift before deployment)
   * - Deploy command (to ensure state accuracy)
   * 
   * Providers MUST implement this to ensure state accuracy.
   * 
   * @param node - CloudDOM node representing expected state
   * @returns Promise resolving to drift detection result
   * 
   * @example
   * ```typescript
   * async detectDrift(node: CloudDOMNode): Promise<DriftDetectionResult> {
   *   // For resources without outputs, no drift possible
   *   if (!node.outputs) {
   *     return { nodeId: node.id, hasDrifted: false, timestamp: Date.now() };
   *   }
   * 
   *   const actualState = await this.getActualResourceState(node.id);
   *   const hasDrifted = !this.statesMatch(node.outputs, actualState);
   *   
   *   return {
   *     nodeId: node.id,
   *     hasDrifted,
   *     expectedState: node.outputs,
   *     actualState,
   *     driftDescription: hasDrifted ? 'Resource no longer exists' : undefined,
   *     timestamp: Date.now(),
   *   };
   * }
   * ```
   */
  detectDrift(node: CloudDOMNode): Promise<DriftDetectionResult>;

  /**
   * Refresh resource state from actual cloud provider (REQUIRED)
   * 
   * Queries the actual state of a resource and updates the node's outputs
   * to reflect reality. This is the mechanism for fixing drift.
   * 
   * Called automatically by CReact when drift is detected.
   * 
   * Providers MUST implement this to enable automatic drift recovery.
   * 
   * @param node - CloudDOM node to refresh
   * @returns Promise resolving when refresh is complete (node.outputs updated)
   * 
   * @example
   * ```typescript
   * async refreshState(node: CloudDOMNode): Promise<void> {
   *   const actualState = await this.getActualResourceState(node.id);
   *   if (actualState) {
   *     // Resource exists - update outputs to match reality
   *     node.outputs = actualState;
   *   } else {
   *     // Resource doesn't exist - clear outputs to force redeployment
   *     node.outputs = undefined;
   *   }
   * }
   * ```
   */
  refreshState(node: CloudDOMNode): Promise<void>;
}
