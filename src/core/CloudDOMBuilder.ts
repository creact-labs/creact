
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

// REQ-01: CloudDOMBuilder - Fiber → CloudDOM transformation

import { FiberNode, CloudDOMNode, OutputChange } from './types';
import { ICloudProvider } from '../providers/ICloudProvider';
import { generateResourceId, normalizePath as normalizePathUtil } from '../utils/naming';
import { StateBindingManager } from './StateBindingManager';
import { ProviderOutputTracker } from './ProviderOutputTracker';
import { ContextDependencyTracker } from './ContextDependencyTracker';
import { getReactiveUpdateQueue } from './ReactiveUpdateQueue';
import { LoggerFactory } from '../utils/Logger';

const logger = LoggerFactory.getLogger('clouddom');

/**
 * CloudDOMBuilder transforms a Fiber tree into a CloudDOM tree
 *
 * The CloudDOM tree represents actual cloud resources to be deployed:
 * - Only includes components that called useInstance (have cloudDOMNode attached)
 * - Filters out container components (no useInstance)
 * - Builds parent-child relationships for deployment order
 * - Generates resource IDs from hierarchical paths
 *
 * REQ-01: JSX → CloudDOM rendering
 * REQ-04: Receives ICloudProvider via dependency injection (not used in build, but available for future extensions)
 */
export class CloudDOMBuilder {
  /**
   * Optional lifecycle hooks for integration with other components
   * Supports async hooks for validation, telemetry, and provider preparation
   */
  private beforeBuildHook?: (fiber: FiberNode) => void | Promise<void>;
  private afterBuildHook?: (rootNodes: CloudDOMNode[]) => void | Promise<void>;

  /**
   * State binding manager for reactive output synchronization
   */
  private stateBindingManager?: StateBindingManager;

  /**
   * Provider output tracker for instance-output binding
   */
  private providerOutputTracker?: ProviderOutputTracker;

  /**
   * Context dependency tracker for context reactivity
   */
  private contextDependencyTracker?: ContextDependencyTracker;

  /**
   * Track existing nodes to handle re-render scenarios
   * Maps node ID to fiber path for duplicate detection during re-renders
   */
  private existingNodeMap = new Map<string, string>();

  /**
   * Constructor receives ICloudProvider via dependency injection
   *
   * REQ-04: Dependency injection pattern - provider is injected, not inherited
   *
   * @param cloudProvider - Cloud provider implementation (injected)
   */
  constructor(private cloudProvider: ICloudProvider) {
    // Provider is stored for potential future use (e.g., provider-specific CloudDOM transformations)
    // For POC, we don't use it during build, but it's available for extensions
  }

  /**
   * Set lifecycle hooks for integration with other components
   *
   * Supports async hooks for:
   * - beforeBuild: Validation, pre-processing, telemetry
   * - afterBuild: Provider preparation, post-processing, logging
   *
   * Example:
   * ```typescript
   * builder.setHooks({
   *   beforeBuild: async fiber => validator.validate(fiber),
   *   afterBuild: async tree => cloudProvider.prepare(tree),
   * });
   * ```
   *
   * @param hooks - Optional lifecycle hooks (sync or async)
   */
  setHooks(hooks: {
    beforeBuild?: (fiber: FiberNode) => void | Promise<void>;
    afterBuild?: (rootNodes: CloudDOMNode[]) => void | Promise<void>;
  }): void {
    this.beforeBuildHook = hooks.beforeBuild;
    this.afterBuildHook = hooks.afterBuild;
  }

  /**
   * Set reactive components for output synchronization
   *
   * @param stateBindingManager - State binding manager instance
   * @param providerOutputTracker - Provider output tracker instance
   * @param contextDependencyTracker - Context dependency tracker instance (optional)
   */
  setReactiveComponents(
    stateBindingManager: StateBindingManager,
    providerOutputTracker: ProviderOutputTracker,
    contextDependencyTracker?: ContextDependencyTracker
  ): void {
    this.stateBindingManager = stateBindingManager;
    this.providerOutputTracker = providerOutputTracker;
    this.contextDependencyTracker = contextDependencyTracker;
  }

  /**
   * Build CloudDOM tree from Fiber tree
   *
   * Traverses the Fiber tree and collects nodes that have cloudDOMNode attached
   * (i.e., components that called useInstance). Container components without
   * useInstance are filtered out, but their children are preserved.
   *
   * Supports async lifecycle hooks for validation and provider preparation.
   *
   * CRITICAL FIX: Preserves nodes from previousCloudDOM that weren't re-rendered.
   * This prevents node loss during selective re-renders (e.g., multi-environment apps).
   *
   * REQ-01: Transform Fiber → CloudDOM
   *
   * @param fiber - Root Fiber node
   * @param previousCloudDOM - Optional previous CloudDOM for incremental builds
   * @returns Promise resolving to array of CloudDOM nodes (top-level resources)
   */
  async build(fiber: FiberNode, previousCloudDOM?: CloudDOMNode[]): Promise<CloudDOMNode[]> {
    if (!fiber) {
      throw new Error('[CloudDOMBuilder] Cannot build CloudDOM from null Fiber tree');
    }

    // Lifecycle hook: beforeBuild (supports async, isolated errors)
    if (this.beforeBuildHook) {
      try {
        await this.beforeBuildHook(fiber);
      } catch (err) {
        // Re-throw validation errors (expected to halt build)
        // But log and continue for non-critical hooks (telemetry, logging)
        if (err instanceof Error && err.message.includes('Validation')) {
          throw err;
        }
        logger.error('beforeBuild hook failed (non-critical):', err);
      }
    }

    // Collect all CloudDOM nodes from the Fiber tree
    const cloudDOMNodes: CloudDOMNode[] = [];
    this.collectCloudDOMNodes(fiber, cloudDOMNodes);

    // CRITICAL FIX: If we have previous CloudDOM and this is an incremental build,
    // preserve nodes that aren't in the current fiber tree
    if (previousCloudDOM && previousCloudDOM.length > 0) {
      const currentNodeIds = new Set(cloudDOMNodes.map(n => n.id));
      
      // Find nodes from previous CloudDOM that aren't in current build
      const preservedNodes = this.flattenCloudDOM(previousCloudDOM).filter(
        node => !currentNodeIds.has(node.id)
      );
      
      if (preservedNodes.length > 0) {
        logger.info(`[CloudDOMBuilder] Preserving ${preservedNodes.length} nodes from previous CloudDOM that weren't re-rendered`);
        cloudDOMNodes.push(...preservedNodes);
      }
    }

    // Validate collected nodes
    this.validateCloudDOMNodes(cloudDOMNodes);

    // Build parent-child relationships
    // CRITICAL: Work with original nodes, not copies, so enhanced proxies see updates
    const rootNodes = this.buildHierarchy(cloudDOMNodes);

    // Detect circular references in hierarchy
    this.detectCircularRefs(rootNodes);

    // Sort root nodes for deterministic order
    rootNodes.sort((a, b) => a.id.localeCompare(b.id));

    // Debug trace in development mode
    if (process.env.NODE_ENV === 'development') {
      logger.debug(
        `Built ${rootNodes.length} root CloudDOM nodes from ${cloudDOMNodes.length} total nodes`
      );
      logger.debug('Tree:', JSON.stringify(rootNodes, null, 2));
    }

    // Lifecycle hook: afterBuild (supports async, isolated errors)
    if (this.afterBuildHook) {
      try {
        await this.afterBuildHook(rootNodes);
      } catch (err) {
        logger.error('afterBuild hook failed (non-critical):', err);
      }
    }

    return rootNodes;
  }

  /**
   * Flatten CloudDOM tree into a flat array of all nodes
   *
   * @param nodes - Root CloudDOM nodes
   * @returns Flattened array of all nodes
   */
  private flattenCloudDOM(nodes: CloudDOMNode[]): CloudDOMNode[] {
    const flattened: CloudDOMNode[] = [];
    
    const walk = (nodeList: CloudDOMNode[]) => {
      for (const node of nodeList) {
        flattened.push(node);
        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      }
    };
    
    walk(nodes);
    return flattened;
  }

  /**
   * Build CloudDOM tree with error handling for CLI/CI environments
   *
   * Provides a safer entrypoint that handles errors gracefully without
   * crashing the entire process. Useful for CI/CD pipelines.
   *
   * @param fiber - Root Fiber node
   * @param previousCloudDOM - Optional previous CloudDOM for incremental builds
   * @returns Promise resolving to array of CloudDOM nodes, or empty array on error
   */
  async buildSafe(fiber: FiberNode, previousCloudDOM?: CloudDOMNode[]): Promise<CloudDOMNode[]> {
    try {
      return await this.build(fiber, previousCloudDOM);
    } catch (error) {
      logger.error('Build failed:', error);
      return [];
    }
  }

  /**
   * Recursively collect CloudDOM nodes from Fiber tree
   *
   * Traverses the Fiber tree depth-first and collects all nodes that have
   * cloudDOMNode or cloudDOMNodes attached (i.e., components that called useInstance).
   *
   * Normalizes paths and IDs during collection for consistency.
   *
   * @param fiber - Current Fiber node
   * @param collected - Array to collect CloudDOM nodes into
   */
  private collectCloudDOMNodes(fiber: FiberNode, collected: CloudDOMNode[]): void {
    // Extract state from useState hooks in this Fiber node
    const stateValues = this.extractOutputsFromFiber(fiber);

    // Check for cloudDOMNodes array (multiple nodes from useInstance calls)
    if ((fiber as any).cloudDOMNodes && Array.isArray((fiber as any).cloudDOMNodes)) {
      for (const cloudNode of (fiber as any).cloudDOMNodes) {
        if (this.isValidCloudNode(cloudNode)) {
          // Normalize path and regenerate ID for consistency
          cloudNode.path = normalizePathUtil(cloudNode.path);
          cloudNode.id = generateResourceId(cloudNode.path);

          // Attach state from useState hooks to CloudDOM node's state field
          if (Object.keys(stateValues).length > 0) {
            cloudNode.state = { ...stateValues };
          }

          collected.push(cloudNode);
          
          logger.debug(`Collected CloudDOM node: ${cloudNode.id} from fiber: ${fiber.path?.join('.')}`);
        } else {
          const nodeId = (cloudNode as any)?.id ?? 'unknown';
          logger.warn(`Skipping invalid CloudDOM node: ${nodeId}`);
        }
      }
    } else {
      // CRITICAL FIX: If this fiber has no cloudDOMNodes but has children,
      // it might be a component that wasn't re-executed during selective re-rendering.
      // Log this for debugging purposes.
      if (fiber.children && fiber.children.length > 0) {
        logger.debug(`Fiber ${fiber.path?.join('.')} has no cloudDOMNodes but has ${fiber.children.length} children`);
      }
    }

    // Legacy cloudDOMNode removed - only cloudDOMNodes array is supported

    // Recursively collect from children
    if (fiber.children && fiber.children.length > 0) {
      for (const child of fiber.children) {
        this.collectCloudDOMNodes(child, collected);
      }
    }
  }

  /**
   * Extract state from useState hooks in a Fiber node
   *
   * REQ-02: Extract outputs from useState calls
   * REQ-06: Universal output access
   * REQ-2.1: Store useState values without 'state.' prefix
   *
   * @param fiber - Fiber node to extract state from
   * @returns Object mapping state keys to values (state1, state2, etc.)
   */
  private extractOutputsFromFiber(fiber: FiberNode): Record<string, any> {
    const stateValues: Record<string, any> = {};

    // Debug logging
    if (process.env.CREACT_DEBUG === 'true') {
      const safeStringify = (value: any) => {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      };
      logger.debug(
        `extractOutputsFromFiber: fiber.path=${fiber.path?.join('.')}, hooks=${safeStringify(fiber.hooks)}`
      );
    }

    // Check if this Fiber has hooks from useState calls
    if (fiber.hooks && Array.isArray(fiber.hooks) && fiber.hooks.length > 0) {
      // Each hook in the array represents a useState call
      // REQ-2.1: Store as state1, state2, etc. (no 'state.' prefix)
      fiber.hooks.forEach((hookValue, index) => {
        // Generate state key without prefix: state1, state2, etc.
        const stateKey = `state${index + 1}`;
        stateValues[stateKey] = hookValue;
      });

      if (process.env.CREACT_DEBUG === 'true') {
        logger.debug(`Extracted useState values without prefix:`, stateValues);
      }
    }

    return stateValues;
  }

  /**
   * Execute post-deployment effects for all Fiber nodes
   * Called after successful deployment to run useEffect callbacks
   *
   * @param fiber - Root Fiber node
   */
  async executePostDeploymentEffects(fiber: FiberNode): Promise<void> {
    const { executeEffects } = await import('../hooks/useEffect');

    logger.debug(`Executing effects for fiber: ${fiber.path?.join('.')}`);
    logger.debug(`Fiber has effects: ${!!(fiber as any).effects}`);

    // Execute effects for this node
    executeEffects(fiber);

    // Recursively execute effects for children
    if (fiber.children && fiber.children.length > 0) {
      for (const child of fiber.children) {
        await this.executePostDeploymentEffects(child);
      }
    }
  }

  /**
   * Sync Fiber hook state back to CloudDOM outputs after effects run
   * This ensures useState changes in useEffect are reflected in the CloudDOM
   *
   * @param fiber - Root Fiber node
   * @param cloudDOM - CloudDOM nodes to update
   */
  syncFiberStateToCloudDOM(fiber: FiberNode, cloudDOM: CloudDOMNode[]): void {
    logger.debug(`Syncing Fiber state to CloudDOM...`);

    // Build a map of CloudDOM nodes by path for fast lookup
    const cloudDOMMap = new Map<string, CloudDOMNode>();

    const buildMap = (nodes: CloudDOMNode[]) => {
      for (const node of nodes) {
        const pathKey = node.path.join('.');
        cloudDOMMap.set(pathKey, node);
        if (node.children && node.children.length > 0) {
          buildMap(node.children);
        }
      }
    };

    buildMap(cloudDOM);

    // Recursively sync Fiber state to CloudDOM
    this.syncFiberNodeToCloudDOM(fiber, cloudDOMMap);

    logger.debug(`Fiber state sync completed`);
  }

  /**
   * Sync a single Fiber node's state to its corresponding CloudDOM node
   */
  private syncFiberNodeToCloudDOM(fiber: FiberNode, cloudDOMMap: Map<string, CloudDOMNode>): void {
    // Check if this Fiber node has corresponding CloudDOM nodes
    if ((fiber as any).cloudDOMNodes && Array.isArray((fiber as any).cloudDOMNodes)) {
      for (const cloudNode of (fiber as any).cloudDOMNodes) {
        this.updateCloudDOMNodeOutputs(fiber, cloudNode);
      }
    }

    // Recursively sync children
    if (fiber.children && fiber.children.length > 0) {
      for (const child of fiber.children) {
        this.syncFiberNodeToCloudDOM(child, cloudDOMMap);
      }
    }
  }

  /**
   * Update a CloudDOM node's state with the latest Fiber hook state
   *
   * REQ-1.2, 1.3: Separate useState values from provider outputs
   * State is stored in separate `state` field, not in `outputs`
   */
  private updateCloudDOMNodeOutputs(fiber: FiberNode, cloudNode: CloudDOMNode): void {
    // Extract fresh state values from the Fiber node
    const stateValues = this.extractOutputsFromFiber(fiber);

    if (Object.keys(stateValues).length > 0) {
      // REQ-1.2: Write to state field, not outputs
      cloudNode.state = stateValues;

      logger.debug(`Synced state for ${cloudNode.id}:`, cloudNode.state);
    }

    // CRITICAL FIX: Sync state back to original nodes that components reference
    this.syncOutputsToOriginalNodes(fiber, cloudNode);
  }

  /**
   * Sync state back to the original CloudDOM nodes that components reference
   * This ensures that enhanced node proxies see the updated state
   */
  private syncOutputsToOriginalNodes(fiber: FiberNode, updatedNode: CloudDOMNode): void {
    // Find the original nodes in the fiber that match this updated node
    if ((fiber as any).cloudDOMNodes && Array.isArray((fiber as any).cloudDOMNodes)) {
      for (const originalNode of (fiber as any).cloudDOMNodes) {
        if (originalNode.id === updatedNode.id) {
          // Update the original node's state with the latest values
          if (updatedNode.state) {
            originalNode.state = { ...updatedNode.state };

            if (process.env.CREACT_DEBUG === 'true') {
              logger.debug(`Synced state to original node ${originalNode.id}:`, originalNode.state);
            }
          }
          break;
        }
      }
    }

    // Legacy cloudDOMNode removed

    // Recursively sync for child fibers
    if (fiber.children && fiber.children.length > 0) {
      for (const child of fiber.children) {
        this.syncOutputsToOriginalNodes(child, updatedNode);
      }
    }
  }

  /**
   * Type guard to validate CloudDOM node structure
   *
   * @param node - Potential CloudDOM node
   * @returns True if node is a valid CloudDOM node
   */
  private isValidCloudNode(node: any): node is CloudDOMNode {
    // Filter out placeholder nodes - they shouldn't be deployed
    if (node?.id?.includes?.('__placeholder__') || node?.constructType === 'Placeholder') {
      return false;
    }

    return (
      typeof node?.id === 'string' &&
      Array.isArray(node?.path) &&
      node.path.length > 0 &&
      typeof node?.construct !== 'undefined' &&
      typeof node?.props === 'object' &&
      Array.isArray(node?.children)
    );
  }

  /**
   * Validate CloudDOM nodes for common issues
   *
   * Checks for:
   * - Duplicate IDs (would cause silent overwrites in hierarchy building)
   * - Invalid paths (empty or non-array)
   * - Circular references in paths
   *
   * Enhanced for re-render scenarios:
   * - Allows re-validation of existing nodes from the same fiber path
   * - Prevents false positives during reactive re-renders
   *
   * @param nodes - CloudDOM nodes to validate
   * @throws Error if duplicate IDs or circular references are found
   */
  private validateCloudDOMNodes(nodes: CloudDOMNode[]): void {
    const seenIds = new Set<string>();
    const pathStrings = new Set<string>();

    for (const node of nodes) {
      const currentFiberPath = node.path.join('.');

      // Check for duplicate IDs with re-render support
      if (seenIds.has(node.id)) {
        // Check if this is a re-render of the same node from the same fiber path
        const existingFiberPath = this.existingNodeMap.get(node.id);
        if (existingFiberPath === currentFiberPath) {
          // This is a re-render of the same node - allow it
          if (process.env.CREACT_DEBUG === 'true') {
            logger.debug(`Re-validating existing node during re-render: ${node.id}`);
          }
          continue;
        }

        // This is a true duplicate from different fiber paths
        throw new Error(
          `[CloudDOMBuilder] Duplicate CloudDOMNode id detected: '${node.id}' at ${this.formatPath(node)}. ` +
            `Each resource must have a unique ID. ` +
            `Use the 'key' prop to differentiate components with the same name.`
        );
      }

      seenIds.add(node.id);
      // Track this node for future re-render validation
      this.existingNodeMap.set(node.id, currentFiberPath);

      // Validate path (should already be filtered in collectCloudDOMNodes, but double-check)
      if (!Array.isArray(node.path) || node.path.length === 0) {
        throw new Error(
          `[CloudDOMBuilder] CloudDOMNode '${node.id}' has invalid path. ` +
            `Path must be a non-empty array of strings.`
        );
      }

      // Check for circular references (path pointing to itself)
      const pathString = node.path.join('.');
      if (pathStrings.has(pathString)) {
        // Multiple nodes with same path could indicate circular reference
        const existingNode = nodes.find((n) => n.path.join('.') === pathString && n.id !== node.id);
        if (existingNode) {
          throw new Error(
            `[CloudDOMBuilder] Circular dependency detected: nodes '${existingNode.id}' and '${node.id}' share the same path '${pathString}'`
          );
        }
      }
      pathStrings.add(pathString);
    }
  }

  /**
   * Create deep defensive copy of CloudDOM nodes to avoid mutation
   *
   * Recursively copies:
   * - Node properties
   * - Props object
   * - Outputs object
   * - Children array (deep copy)
   *
   * This prevents mutations from later phases (e.g., provider injection,
   * dependency graph tagging) from affecting the original nodes.
   *
   * @param nodes - Original CloudDOM nodes
   * @returns Deep copy of nodes
   */
  private createDeepDefensiveCopy(nodes: CloudDOMNode[]): CloudDOMNode[] {
    return nodes.map((node) => ({
      ...node,
      props: { ...node.props },
      outputs: node.outputs ? { ...node.outputs } : undefined,
      children: node.children ? this.createDeepDefensiveCopy(node.children) : [],
    }));
  }

  /**
   * Build parent-child hierarchy from flat list of CloudDOM nodes
   *
   * Uses the path property to determine parent-child relationships:
   * - A node is a child of another if its path starts with the parent's path
   * - Returns only root nodes (nodes with no parent)
   *
   * Example:
   * - ['registry'] is root
   * - ['registry', 'service'] is child of ['registry']
   * - ['registry', 'service', 'task'] is child of ['registry', 'service']
   *
   * Optimization: Groups nodes by depth for O(n) parent lookup instead of O(n²)
   *
   * @param nodes - Flat array of CloudDOM nodes
   * @returns Array of root CloudDOM nodes with children attached
   */
  private buildHierarchy(nodes: CloudDOMNode[]): CloudDOMNode[] {
    if (nodes.length === 0) {
      return [];
    }

    // Group nodes by depth (path length) for optimized parent lookup
    const nodesByDepth = new Map<number, CloudDOMNode[]>();
    for (const node of nodes) {
      const depth = node.path.length;
      if (!nodesByDepth.has(depth)) {
        nodesByDepth.set(depth, []);
      }
      nodesByDepth.get(depth)!.push(node);
    }

    // Find root nodes and build parent-child relationships
    const rootNodes: CloudDOMNode[] = [];

    for (const node of nodes) {
      // Find parent by checking nodes at depth - 1
      const parentNode = this.findParentOptimized(node, nodesByDepth);

      if (parentNode) {
        // Add this node as a child of its parent
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(node);
      } else {
        // No parent found - this is a root node
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  /**
   * Find the parent node for a given node (optimized version)
   *
   * A node is the parent if:
   * 1. Its path is a prefix of the child's path
   * 2. Its path length is exactly one less than the child's path length (immediate parent)
   *
   * Example:
   * - Child path: ['registry', 'service', 'task']
   * - Parent path: ['registry', 'service'] ✓ (immediate parent)
   * - Not parent: ['registry'] ✗ (grandparent, not immediate)
   *
   * Optimization: Uses nodesByDepth map to only search nodes at parent depth (O(n) instead of O(n²))
   *
   * @param node - Node to find parent for
   * @param nodesByDepth - Map of nodes grouped by path depth
   * @returns Parent node or undefined if no parent
   */
  private findParentOptimized(
    node: CloudDOMNode,
    nodesByDepth: Map<number, CloudDOMNode[]>
  ): CloudDOMNode | undefined {
    // Root nodes have no parent
    if (node.path.length === 1) {
      return undefined;
    }

    // Look for immediate parent at depth - 1
    const parentDepth = node.path.length - 1;
    const possibleParents = nodesByDepth.get(parentDepth);

    if (!possibleParents) {
      // No nodes at parent depth - this is an orphan node
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`Orphaned node '${node.id}' (parent missing for path ${node.path.join('.')})`);
      }
      return undefined;
    }

    // Find parent by checking if path is a prefix
    return possibleParents.find((parent) =>
      parent.path.every((segment, i) => segment === node.path[i])
    );
  }

  /**
   * Get the cloud provider (for testing/debugging)
   *
   * @returns The injected cloud provider
   */
  getCloudProvider(): ICloudProvider {
    return this.cloudProvider;
  }

  /**
   * Convert CloudDOM tree to flat map for debugging and backend storage
   *
   * Useful for:
   * - Backend state providers that need flat ID → node mapping
   * - Debugging and inspection
   * - Quick lookups by ID
   *
   * Type-safe: Preserves node subtype information for provider-specific extensions
   *
   * @param rootNodes - Root CloudDOM nodes
   * @returns Flat map of ID → CloudDOM node
   */
  toFlatMap<T extends CloudDOMNode = CloudDOMNode>(rootNodes: T[]): Record<string, T> {
    const map: Record<string, T> = {};

    const walk = (node: T) => {
      map[node.id] = node;
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => walk(child as T));
      }
    };

    rootNodes.forEach(walk);
    return map;
  }

  /**
   * Normalize path segments for consistent resource addressing
   *
   * Ensures consistent casing and formatting across environments:
   * - Trims whitespace
   * - Converts to lowercase
   * - Replaces slashes and spaces with hyphens
   *
   * REQ-NF: Future safety for cross-OS consistency
   *
   * @param path - Path segments to normalize
   * @returns Normalized path segments
   */
  private normalizePath(path: string[]): string[] {
    return path.map(
      (segment) =>
        segment
          .trim()
          .toLowerCase()
          .replace(/[\/\s]+/g, '-')
          .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    );
  }

  /**
   * Format path for human-readable error messages
   *
   * @param node - CloudDOM node
   * @returns Formatted path string (e.g., "registry > service > task")
   */
  private formatPath(node: CloudDOMNode): string {
    return node.path.join(' > ');
  }

  /**
   * Detect circular references in CloudDOM hierarchy
   *
   * Uses depth-first search to detect cycles in parent-child relationships.
   * This is a graph-level safety check beyond simple path validation.
   *
   * @param nodes - Root CloudDOM nodes
   * @throws Error if circular hierarchy is detected
   */
  private detectCircularRefs(nodes: CloudDOMNode[]): void {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (node: CloudDOMNode) => {
      if (stack.has(node.id)) {
        throw new Error(
          `[CloudDOMBuilder] Circular hierarchy detected at '${node.id}' (path: ${this.formatPath(node)})`
        );
      }
      if (visited.has(node.id)) {
        return;
      }

      visited.add(node.id);
      stack.add(node.id);

      if (node.children && node.children.length > 0) {
        node.children.forEach(dfs);
      }

      stack.delete(node.id);
    };

    nodes.forEach(dfs);
  }

  /**
   * Build efficient node map for CloudDOM comparison
   * Creates a flat map of node ID to node for fast lookup during comparison
   * Handles nested node structures properly
   *
   * REQ-1.4, 9.1: Efficient map building for CloudDOM comparison
   *
   * @param nodes - CloudDOM nodes to map
   * @returns Map of node ID to CloudDOM node
   */
  private buildNodeMap(nodes: CloudDOMNode[]): Map<string, CloudDOMNode> {
    const nodeMap = new Map<string, CloudDOMNode>();

    const walkNodes = (nodeList: CloudDOMNode[]) => {
      for (const node of nodeList) {
        // Ensure consistent node identification
        if (node.id) {
          nodeMap.set(node.id, node);
        }

        // Recursively handle nested children
        if (node.children && node.children.length > 0) {
          walkNodes(node.children);
        }
      }
    };

    walkNodes(nodes);
    return nodeMap;
  }

  /**
   * Detect output changes after deployment by comparing previous and current CloudDOM
   * This is called after deployment to identify which provider outputs have changed
   *
   * Enhanced to:
   * - Compare previous and current CloudDOM states properly
   * - Identify specific output keys that changed
   * - Track affected fibers for each change
   *
   * REQ-1.4, 1.5, 9.1, 9.2, 9.3: Enhanced output change detection
   *
   * @param previous - Previous CloudDOM state
   * @param current - Current CloudDOM state after deployment
   * @returns Array of output changes detected
   */
  detectOutputChanges(previous: CloudDOMNode[], current: CloudDOMNode[]): OutputChange[] {
    const changes: OutputChange[] = [];

    // REQ-9.1: Build efficient maps for comparison using buildNodeMap
    const previousMap = this.buildNodeMap(previous);
    const currentMap = this.buildNodeMap(current);

    if (process.env.CREACT_DEBUG === 'true') {
      logger.debug(
        `Detecting output changes: ${previousMap.size} previous nodes, ${currentMap.size} current nodes`
      );
    }

    // REQ-9.2, 9.3: Compare previous and current states, identify specific changes
    // Check for changed outputs in existing nodes and new outputs in new nodes
    for (const [nodeId, currentNode] of currentMap.entries()) {
      const previousNode = previousMap.get(nodeId);

      // REQ-9.3: Track affected fibers for each change
      const getAffectedFibers = (): FiberNode[] => {
        if (!this.providerOutputTracker) {
          return [];
        }
        return Array.from(this.providerOutputTracker.getBindingsForInstance(nodeId));
      };

      if (previousNode) {
        // Node existed before - check for changed or new outputs
        const currentOutputs = currentNode.outputs || {};
        const previousOutputs = previousNode.outputs || {};

        // Check for changed or new outputs
        for (const [outputKey, currentValue] of Object.entries(currentOutputs)) {
          const previousValue = previousOutputs[outputKey];

          // REQ-9.2: Identify specific output keys that changed
          if (previousValue !== currentValue) {
            changes.push({
              nodeId,
              outputKey,
              previousValue,
              newValue: currentValue,
              affectedFibers: getAffectedFibers(),
            });

            if (process.env.CREACT_DEBUG === 'true') {
              logger.debug(
                `Output changed: ${nodeId}.${outputKey} (${previousValue} → ${currentValue})`
              );
            }
          }
        }

        // Check for removed outputs
        for (const [outputKey, previousValue] of Object.entries(previousOutputs)) {
          if (!(outputKey in currentOutputs)) {
            changes.push({
              nodeId,
              outputKey,
              previousValue,
              newValue: undefined,
              affectedFibers: getAffectedFibers(),
            });

            if (process.env.CREACT_DEBUG === 'true') {
              logger.debug(`Output removed: ${nodeId}.${outputKey}`);
            }
          }
        }
      } else {
        // New node - all outputs are new
        const currentOutputs = currentNode.outputs || {};

        for (const [outputKey, currentValue] of Object.entries(currentOutputs)) {
          changes.push({
            nodeId,
            outputKey,
            previousValue: undefined,
            newValue: currentValue,
            affectedFibers: getAffectedFibers(),
          });

          if (process.env.CREACT_DEBUG === 'true') {
            logger.debug(`New output: ${nodeId}.${outputKey} = ${currentValue}`);
          }
        }
      }
    }

    // Check for deleted nodes (all their outputs are removed)
    for (const [nodeId, previousNode] of previousMap.entries()) {
      if (!currentMap.has(nodeId)) {
        const previousOutputs = previousNode.outputs || {};
        const getAffectedFibers = (): FiberNode[] => {
          if (!this.providerOutputTracker) {
            return [];
          }
          return Array.from(this.providerOutputTracker.getBindingsForInstance(nodeId));
        };

        for (const [outputKey, previousValue] of Object.entries(previousOutputs)) {
          changes.push({
            nodeId,
            outputKey,
            previousValue,
            newValue: undefined,
            affectedFibers: getAffectedFibers(),
          });

          if (process.env.CREACT_DEBUG === 'true') {
            logger.debug(`Node deleted, output removed: ${nodeId}.${outputKey}`);
          }
        }
      }
    }

    if (process.env.CREACT_DEBUG === 'true') {
      logger.debug(`Detected ${changes.length} output changes`);
    }

    return changes;
  }

  /**
   * Synchronize provider outputs to bound state and trigger re-renders
   * This is the main method called after deployment to update reactive state
   *
   * @param fiber - Root fiber node
   * @param cloudDOM - Current CloudDOM after deployment
   * @param previousCloudDOM - Previous CloudDOM state (optional)
   * @returns Promise resolving to affected fibers that need re-rendering
   */
  async syncOutputsAndReRender(
    fiber: FiberNode,
    cloudDOM: CloudDOMNode[],
    previousCloudDOM?: CloudDOMNode[]
  ): Promise<FiberNode[]> {
    if (!this.stateBindingManager || !this.providerOutputTracker) {
      logger.warn('Reactive components not set, skipping output sync');
      return [];
    }

    try {
      // Step 1: Update provider output tracker with new outputs
      // Note: Output syncing to original nodes is now done before effects in integrateWithPostDeploymentEffects
      const outputChanges: OutputChange[] = [];

      for (const node of cloudDOM) {
        if (node.outputs) {
          const nodeChanges = this.providerOutputTracker.updateInstanceOutputs(
            node.id,
            node.outputs
          );
          outputChanges.push(...nodeChanges);
        }
      }

      // Step 2: If we have previous state, detect additional changes
      if (previousCloudDOM) {
        const additionalChanges = this.detectOutputChanges(previousCloudDOM, cloudDOM);

        // Merge changes, avoiding duplicates
        for (const change of additionalChanges) {
          const exists = outputChanges.some(
            (existing) =>
              existing.nodeId === change.nodeId && existing.outputKey === change.outputKey
          );
          if (!exists) {
            outputChanges.push(change);
          }
        }
      }

      // Step 3: Apply output changes to bound state
      const stateAffectedFibers = this.applyOutputChangesToState(outputChanges);

      // Step 4: Update context provider values (NEW - enables context reactivity)
      // This re-evaluates context provider values that depend on outputs
      console.log('[CONTEXT REACTIVITY] Updating context provider values after output changes...');
      const contextAffectedFibers = this.updateContextProviderValues(fiber);

      // Merge affected fibers from both state and context updates
      const allAffectedFibers = [...stateAffectedFibers];
      for (const contextFiber of contextAffectedFibers) {
        if (!allAffectedFibers.includes(contextFiber)) {
          allAffectedFibers.push(contextFiber);
        }
      }

      // Debug logging
      console.log(`[CONTEXT REACTIVITY] Synced ${outputChanges.length} output changes`);
      console.log(`[CONTEXT REACTIVITY]   State affected: ${stateAffectedFibers.length} fibers`);
      logger.debug(`  Context affected: ${contextAffectedFibers.length} fibers`);
      logger.debug(`  Total affected: ${allAffectedFibers.length} fibers`);

      // NEW (Gap 2): Flush ReactiveUpdateQueue to get all dirty fibers
      // This includes fibers enqueued by applyOutputChangesToState
      const reactiveQueue = getReactiveUpdateQueue();
      const queuedFibers = reactiveQueue.flush();

      if (queuedFibers.length > 0) {
        logger.debug(`Flushed ${queuedFibers.length} fibers from ReactiveUpdateQueue`);

        // Merge queued fibers with affected fibers (avoid duplicates)
        for (const queuedFiber of queuedFibers) {
          if (!allAffectedFibers.includes(queuedFiber)) {
            allAffectedFibers.push(queuedFiber);
          }
        }
      }

      logger.debug(`Total affected fibers after queue flush: ${allAffectedFibers.length}`);

      return allAffectedFibers;
    } catch (error) {
      logger.error('Error during output synchronization:', error);
      return [];
    }
  }

  /**
   * Sync CloudDOM outputs to the original nodes that components reference
   * This is critical for reactivity to work - components need to see updated outputs
   */
  private syncCloudDOMOutputsToOriginalNodes(fiber: FiberNode, cloudDOM: CloudDOMNode[]): void {
    logger.debug('syncCloudDOMOutputsToOriginalNodes called');
    logger.debug(`CloudDOM nodes to sync: ${cloudDOM.length}`);

    // Build a map of CloudDOM nodes by ID for fast lookup
    const cloudDOMMap = new Map<string, CloudDOMNode>();

    const buildMap = (nodes: CloudDOMNode[]) => {
      for (const node of nodes) {
        cloudDOMMap.set(node.id, node);
        if (node.outputs && Object.keys(node.outputs).length > 0) {
          logger.debug(`CloudDOM node ${node.id} has outputs:`, Object.keys(node.outputs));
        }
        if (node.children && node.children.length > 0) {
          buildMap(node.children);
        }
      }
    };

    buildMap(cloudDOM);
    logger.debug(`Built CloudDOM map with ${cloudDOMMap.size} nodes`);

    // Recursively sync outputs to original nodes
    this.syncOutputsToOriginalNodesRecursive(fiber, cloudDOMMap);
  }

  /**
   * Recursively sync outputs to original nodes in the fiber tree
   */
  private syncOutputsToOriginalNodesRecursive(
    fiber: FiberNode,
    cloudDOMMap: Map<string, CloudDOMNode>
  ): void {
    // Sync outputs for nodes in this fiber
    if ((fiber as any).cloudDOMNodes && Array.isArray((fiber as any).cloudDOMNodes)) {
      for (const originalNode of (fiber as any).cloudDOMNodes) {
        const updatedNode = cloudDOMMap.get(originalNode.id);
        if (updatedNode && updatedNode.outputs) {
          if (!originalNode.outputs) {
            originalNode.outputs = {};
          }

          // Merge outputs from the deployed CloudDOM back to the original node
          const beforeOutputs = { ...originalNode.outputs };
          Object.assign(originalNode.outputs, updatedNode.outputs);

          logger.debug(`✓ Synced outputs to original node ${originalNode.id}`);
          logger.debug(`  Before:`, beforeOutputs);
          logger.debug(`  After:`, originalNode.outputs);
        }
      }
    }

    // Legacy cloudDOMNode removed

    // Recursively sync for child fibers
    if (fiber.children && fiber.children.length > 0) {
      for (const child of fiber.children) {
        this.syncOutputsToOriginalNodesRecursive(child, cloudDOMMap);
      }
    }
  }

  /**
   * Update context provider values when outputs change
   * This enables context reactivity by finding components that create context values from outputs
   *
   * Strategy:
   * 1. Find all fibers that have both cloudDOMNodes (use outputs) AND render a Context.Provider child
   * 2. These are the components that create context values from outputs
   * 3. Mark them for re-render so they re-evaluate their context values
   *
   * @param fiber - Root fiber to search
   * @returns Array of fibers that need re-rendering (components creating context values from outputs)
   */
  private updateContextProviderValues(fiber: FiberNode): FiberNode[] {
    const affectedFibers: FiberNode[] = [];

    // Recursively find components that create context values from outputs
    this.findContextValueCreators(fiber, affectedFibers);

    return affectedFibers;
  }

  /**
   * Recursively find components that create context values from outputs
   * These are components that:
   * 1. Have cloudDOMNodes (use useInstance - depend on outputs)
   * 2. Have children that are Context.Provider components
   */
  private findContextValueCreators(fiber: FiberNode, affectedFibers: FiberNode[]): void {
    // IMPORTANT: Don't automatically mark context value creators as affected
    // Only mark them if their specific outputs changed (handled by ProviderOutputTracker)
    // This prevents unnecessary re-renders that lose context values from parent providers
    
    // Recursively process children only (don't mark anything as affected)
    if (fiber.children && fiber.children.length > 0) {
      for (const child of fiber.children) {
        this.findContextValueCreators(child, affectedFibers);
      }
    }
  }

  /**
   * Apply output changes to bound state using StateBindingManager
   * This updates useState values that are bound to provider outputs
   *
   * Enhanced to:
   * - Apply detected changes to bound state via StateBindingManager
   * - Handle binding updates without creating loops
   * - Return affected fibers for re-rendering
   *
   * REQ-9.4, 9.5: Apply output changes to state and return affected fibers
   *
   * @param changes - Array of output changes to apply
   * @returns Array of fibers affected by the changes
   */
  applyOutputChangesToState(changes: OutputChange[]): FiberNode[] {
    if (!this.stateBindingManager) {
      if (process.env.CREACT_DEBUG === 'true') {
        logger.debug('No StateBindingManager available, skipping state updates');
      }
      return [];
    }

    if (changes.length === 0) {
      if (process.env.CREACT_DEBUG === 'true') {
        logger.debug('No output changes to apply');
      }
      return [];
    }

    try {
      if (process.env.CREACT_DEBUG === 'true') {
        logger.debug(`Applying ${changes.length} output changes to bound state`);
      }

      // REQ-9.4: Process changes through state binding manager
      // This uses internal setState to prevent circular dependencies (REQ-4.2, 4.4)
      const affectedFibers = this.stateBindingManager.processOutputChanges(changes);

      if (process.env.CREACT_DEBUG === 'true') {
        logger.debug(`${affectedFibers.length} fibers affected by output changes`);
      }

      // Notify provider output tracker about the changes for tracking
      if (this.providerOutputTracker) {
        try {
          this.providerOutputTracker.notifyOutputChanges(changes);
        } catch (error) {
          logger.warn('Error notifying provider output tracker:', error);
          // Continue despite notification failure
        }
      }

      // NEW (Gap 2): Enqueue affected fibers to ReactiveUpdateQueue
      // This batches re-renders and prevents duplicate scheduling
      const reactiveQueue = getReactiveUpdateQueue();
      affectedFibers.forEach((fiber) => {
        reactiveQueue.enqueue(fiber);
      });

      if (process.env.CREACT_DEBUG === 'true') {
        logger.debug(`Enqueued ${affectedFibers.length} fibers to ReactiveUpdateQueue`);
      }

      // Execute reactive effects for affected fibers
      // This triggers useEffect callbacks that depend on changed outputs
      this.executeReactiveEffects(affectedFibers, changes);

      // REQ-9.5: Return affected fibers for re-rendering
      return affectedFibers;
    } catch (error) {
      logger.error('Error applying output changes to state:', error);

      // Return empty array to prevent re-render failures from blocking deployment
      // The error has been logged for debugging
      return [];
    }
  }

  /**
   * Execute reactive effects for fibers affected by output changes
   * This triggers useEffect callbacks that depend on changed provider outputs
   *
   * @param affectedFibers - Fibers that were affected by output changes
   * @param changes - Output changes that occurred
   */
  private async executeReactiveEffects(
    affectedFibers: FiberNode[],
    changes: OutputChange[]
  ): Promise<void> {
    if (affectedFibers.length === 0) {
      return;
    }

    try {
      const { executeEffectsOnOutputChange } = await import('../hooks/useEffect');
      const { generateBindingKey } = await import('../utils/naming');

      // Convert output changes to binding keys for effect matching
      const changedOutputKeys = new Set<string>();
      for (const change of changes) {
        const bindingKey = generateBindingKey(change.nodeId, change.outputKey);
        changedOutputKeys.add(bindingKey);
      }

      // Execute reactive effects for each affected fiber
      for (const fiber of affectedFibers) {
        executeEffectsOnOutputChange(fiber, changedOutputKeys);
      }

      if (process.env.CREACT_DEBUG === 'true') {
        logger.debug(`Executed reactive effects for ${affectedFibers.length} fibers`);
      }
    } catch (error) {
      logger.error('Error executing reactive effects:', error);
    }
  }

  /**
   * Integrate with post-deployment effects to trigger output synchronization
   * This method should be called after deployment completes
   *
   * Phase ordering (REQ-1.1, 1.2, 1.5):
   * 1. Sync outputs to original nodes BEFORE executing effects
   * 2. Execute effects (they can now see updated outputs)
   * 3. Sync outputs and trigger re-renders for reactive changes
   * 4. Sync state changes back to CloudDOM
   *
   * @param fiber - Root fiber node
   * @param cloudDOM - Current CloudDOM after deployment
   * @param previousCloudDOM - Previous CloudDOM state (optional)
   * @returns Promise resolving to affected fibers that need re-rendering
   */
  async integrateWithPostDeploymentEffects(
    fiber: FiberNode,
    cloudDOM: CloudDOMNode[],
    previousCloudDOM?: CloudDOMNode[]
  ): Promise<FiberNode[]> {
    logger.info('*** Starting post-deployment integration ***');
    logger.debug(`CloudDOM nodes: ${cloudDOM.length}`);
    logger.debug(`Fiber path: ${fiber.path?.join('.')}`);

    try {
      // PHASE 1: Sync outputs to original nodes FIRST (REQ-1.1, 1.4)
      // This ensures effects have access to current provider outputs
      logger.debug('PHASE 1: Syncing outputs to original nodes...');
      try {
        this.syncCloudDOMOutputsToOriginalNodes(fiber, cloudDOM);
        logger.debug('✓ Phase 1 complete: Outputs synced to original nodes');
      } catch (error) {
        logger.error('✗ Phase 1 failed: Error syncing outputs to original nodes:', error);
        throw new Error(`Output sync failed: ${(error as Error).message}`);
      }

      // PHASE 2: Execute post-deployment effects (REQ-1.2, 1.5)
      // Effects now have access to current outputs from Phase 1
      logger.debug('PHASE 2: Executing post-deployment effects...');
      try {
        await this.executePostDeploymentEffects(fiber);
        logger.debug('✓ Phase 2 complete: Effects executed with current outputs');
      } catch (error) {
        logger.error('✗ Phase 2 failed: Error executing effects:', error);
        // Continue to next phase even if effects fail (non-critical)
        logger.warn('Continuing to next phase despite effect execution failure');
      }

      // PHASE 3: Sync outputs and trigger re-renders (REQ-1.5)
      // Detect output changes and update bound state
      logger.debug('PHASE 3: Syncing outputs and triggering re-renders...');
      let affectedFibers: FiberNode[] = [];
      try {
        affectedFibers = await this.syncOutputsAndReRender(fiber, cloudDOM, previousCloudDOM);
        logger.debug(
          `✓ Phase 3 complete: ${affectedFibers.length} fibers affected by output changes`
        );
      } catch (error) {
        logger.error('✗ Phase 3 failed: Error syncing outputs and re-renders:', error);
        // Continue to next phase even if re-render sync fails (non-critical)
        logger.warn('Continuing to next phase despite re-render sync failure');
      }

      // PHASE 4: Sync state changes back to CloudDOM
      // Persist any state changes from effects
      logger.debug('PHASE 4: Syncing fiber state to CloudDOM...');
      try {
        this.syncFiberStateToCloudDOM(fiber, cloudDOM);
        logger.debug('✓ Phase 4 complete: Fiber state synced to CloudDOM');
      } catch (error) {
        logger.error('✗ Phase 4 failed: Error syncing fiber state:', error);
        // Continue despite failure (state will be synced on next deployment)
        logger.warn('State sync failed but deployment can continue');
      }

      logger.info(
        `*** Post-deployment integration complete: ${affectedFibers.length} affected fibers ***`
      );
      return affectedFibers;
    } catch (error) {
      logger.error('✗✗✗ Critical error in post-deployment integration:', error);
      logger.error('Stack trace:', (error as Error).stack);

      // Return empty array to allow deployment to complete
      // The error has been logged for debugging
      return [];
    }
  }

  /**
   * Clear the existing node map (for testing or fresh builds)
   * This allows starting with a clean slate for node validation
   */
  clearExistingNodes(): void {
    this.existingNodeMap.clear();
  }

  /**
   * Get the existing node map (for debugging/inspection)
   * Returns a copy to prevent external mutation
   */
  getExistingNodes(): Map<string, string> {
    return new Map(this.existingNodeMap);
  }

  /**
   * Create a JSON replacer function that handles Symbols safely
   * Converts Symbols to their string representation for debugging
   */
  private createSymbolReplacer(): (key: string, value: any) => any {
    return (key: string, value: any) => {
      if (typeof value === 'symbol') {
        return String(value);
      }
      if (typeof value === 'function' && value._contextId && typeof value._contextId === 'symbol') {
        // Handle context provider/consumer functions with Symbol IDs
        return {
          ...value,
          _contextId: String(value._contextId),
        };
      }
      return value;
    };
  }
}
