// REQ-01: CloudDOMBuilder - Fiber → CloudDOM transformation

import { FiberNode, CloudDOMNode, OutputChange } from './types';
import { ICloudProvider } from '../providers/ICloudProvider';
import { generateResourceId, normalizePath as normalizePathUtil } from '../utils/naming';
import { StateBindingManager } from './StateBindingManager';
import { ProviderOutputTracker } from './ProviderOutputTracker';

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
   */
  setReactiveComponents(
    stateBindingManager: StateBindingManager,
    providerOutputTracker: ProviderOutputTracker
  ): void {
    this.stateBindingManager = stateBindingManager;
    this.providerOutputTracker = providerOutputTracker;
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
   * REQ-01: Transform Fiber → CloudDOM
   *
   * @param fiber - Root Fiber node
   * @returns Promise resolving to array of CloudDOM nodes (top-level resources)
   */
  async build(fiber: FiberNode): Promise<CloudDOMNode[]> {
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
        console.error('[CloudDOMBuilder] beforeBuild hook failed (non-critical):', err);
      }
    }

    // Collect all CloudDOM nodes from the Fiber tree
    const cloudDOMNodes: CloudDOMNode[] = [];
    this.collectCloudDOMNodes(fiber, cloudDOMNodes);

    // Validate collected nodes
    this.validateCloudDOMNodes(cloudDOMNodes);

    // Build parent-child relationships (with deep defensive copy to avoid mutation)
    const nodesCopy = this.createDeepDefensiveCopy(cloudDOMNodes);
    const rootNodes = this.buildHierarchy(nodesCopy);

    // Detect circular references in hierarchy
    this.detectCircularRefs(rootNodes);

    // Sort root nodes for deterministic order
    rootNodes.sort((a, b) => a.id.localeCompare(b.id));

    // Debug trace in development mode
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        `[CloudDOMBuilder] Built ${rootNodes.length} root CloudDOM nodes from ${cloudDOMNodes.length} total nodes`
      );
      console.debug('[CloudDOMBuilder] Tree:', JSON.stringify(rootNodes, null, 2));
    }

    // Lifecycle hook: afterBuild (supports async, isolated errors)
    if (this.afterBuildHook) {
      try {
        await this.afterBuildHook(rootNodes);
      } catch (err) {
        console.error('[CloudDOMBuilder] afterBuild hook failed (non-critical):', err);
      }
    }

    return rootNodes;
  }

  /**
   * Build CloudDOM tree with error handling for CLI/CI environments
   *
   * Provides a safer entrypoint that handles errors gracefully without
   * crashing the entire process. Useful for CI/CD pipelines.
   *
   * @param fiber - Root Fiber node
   * @returns Promise resolving to array of CloudDOM nodes, or empty array on error
   */
  async buildSafe(fiber: FiberNode): Promise<CloudDOMNode[]> {
    try {
      return await this.build(fiber);
    } catch (error) {
      console.error('[CloudDOMBuilder] Build failed:', error);
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
    // Extract outputs from useState hooks in this Fiber node
    const outputs = this.extractOutputsFromFiber(fiber);

    // Check for cloudDOMNodes array (multiple nodes from useInstance calls)
    if ((fiber as any).cloudDOMNodes && Array.isArray((fiber as any).cloudDOMNodes)) {
      for (const cloudNode of (fiber as any).cloudDOMNodes) {
        if (this.isValidCloudNode(cloudNode)) {
          // Normalize path and regenerate ID for consistency
          cloudNode.path = normalizePathUtil(cloudNode.path);
          cloudNode.id = generateResourceId(cloudNode.path);

          // Attach outputs from useState hooks to CloudDOM node
          if (Object.keys(outputs).length > 0) {
            cloudNode.outputs = { ...cloudNode.outputs, ...outputs };
          }

          collected.push(cloudNode);
        } else {
          const nodeId = (cloudNode as any)?.id ?? 'unknown';
          console.warn(`[CloudDOMBuilder] Skipping invalid CloudDOM node: ${nodeId}`);
        }
      }
    }

    // Also check for single cloudDOMNode (legacy/alternative approach)
    if (fiber.cloudDOMNode) {
      // Store reference to avoid type narrowing issues
      const cloudNode = fiber.cloudDOMNode;

      // Type guard validation
      if (this.isValidCloudNode(cloudNode)) {
        // Normalize path and regenerate ID for consistency
        cloudNode.path = normalizePathUtil(cloudNode.path);
        cloudNode.id = generateResourceId(cloudNode.path);

        // Attach outputs from useState hooks to CloudDOM node
        if (Object.keys(outputs).length > 0) {
          cloudNode.outputs = { ...cloudNode.outputs, ...outputs };
        }

        collected.push(cloudNode);
      } else {
        // Use the stored reference to avoid type narrowing issues
        const nodeId = (cloudNode as any)?.id ?? 'unknown';
        console.warn(`[CloudDOMBuilder] Skipping invalid CloudDOM node: ${nodeId}`);
      }
    }

    // Recursively collect from children
    if (fiber.children && fiber.children.length > 0) {
      for (const child of fiber.children) {
        this.collectCloudDOMNodes(child, collected);
      }
    }
  }

  /**
   * Extract outputs from useState hooks in a Fiber node
   *
   * REQ-02: Extract outputs from useState calls
   * REQ-06: Universal output access
   *
   * @param fiber - Fiber node to extract outputs from
   * @returns Object mapping output keys to values
   */
  private extractOutputsFromFiber(fiber: FiberNode): Record<string, any> {
    const outputs: Record<string, any> = {};

    // Debug logging
    if (process.env.CREACT_DEBUG === 'true') {
      console.debug(`[CloudDOMBuilder] extractOutputsFromFiber: fiber.path=${fiber.path?.join('.')}, hooks=${JSON.stringify(fiber.hooks)}`);
    }

    // Check if this Fiber has hooks from useState calls
    if (fiber.hooks && Array.isArray(fiber.hooks) && fiber.hooks.length > 0) {
      // Each hook in the array represents a useState call
      // We need to generate keys for each hook value
      fiber.hooks.forEach((hookValue, index) => {
        // Generate output key: hook-{index} or use a more meaningful name if available
        // For now, use index-based keys since we don't have explicit names
        const outputKey = `state${index}`;
        outputs[outputKey] = hookValue;
      });

      if (process.env.CREACT_DEBUG === 'true') {
        console.debug(`[CloudDOMBuilder] Extracted outputs: ${JSON.stringify(outputs)}`);
      }
    }

    return outputs;
  }

  /**
   * Execute post-deployment effects for all Fiber nodes
   * Called after successful deployment to run useEffect callbacks
   *
   * @param fiber - Root Fiber node
   */
  async executePostDeploymentEffects(fiber: FiberNode): Promise<void> {
    const { executeEffects } = await import('../hooks/useEffect');

    console.log(`[CloudDOMBuilder] Executing effects for fiber: ${fiber.path?.join('.')}`);
    console.log(`[CloudDOMBuilder] Fiber has effects: ${!!(fiber as any).effects}`);

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
    console.log(`[CloudDOMBuilder] Syncing Fiber state to CloudDOM...`);

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

    console.log(`[CloudDOMBuilder] Fiber state sync completed`);
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

    if (fiber.cloudDOMNode) {
      this.updateCloudDOMNodeOutputs(fiber, fiber.cloudDOMNode);
    }

    // Recursively sync children
    if (fiber.children && fiber.children.length > 0) {
      for (const child of fiber.children) {
        this.syncFiberNodeToCloudDOM(child, cloudDOMMap);
      }
    }
  }

  /**
   * Update a CloudDOM node's outputs with the latest Fiber hook state
   */
  private updateCloudDOMNodeOutputs(fiber: FiberNode, cloudNode: CloudDOMNode): void {
    // Extract fresh outputs from the Fiber node
    const freshOutputs = this.extractOutputsFromFiber(fiber);

    if (Object.keys(freshOutputs).length > 0) {
      console.log(`[CloudDOMBuilder] Updating outputs for ${cloudNode.id}:`, freshOutputs);

      // Update the CloudDOM node's outputs
      cloudNode.outputs = { ...cloudNode.outputs, ...freshOutputs };
    }
  }

  /**
   * Type guard to validate CloudDOM node structure
   *
   * @param node - Potential CloudDOM node
   * @returns True if node is a valid CloudDOM node
   */
  private isValidCloudNode(node: any): node is CloudDOMNode {
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
   * @param nodes - CloudDOM nodes to validate
   * @throws Error if duplicate IDs or circular references are found
   */
  private validateCloudDOMNodes(nodes: CloudDOMNode[]): void {
    const seenIds = new Set<string>();
    const pathStrings = new Set<string>();

    for (const node of nodes) {
      // Check for duplicate IDs
      if (seenIds.has(node.id)) {
        throw new Error(
          `[CloudDOMBuilder] Duplicate CloudDOMNode id detected: '${node.id}' at ${this.formatPath(node)}. ` +
          `Each resource must have a unique ID. ` +
          `Use the 'key' prop to differentiate components with the same name.`
        );
      }
      seenIds.add(node.id);

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
        console.warn(
          `[CloudDOMBuilder] Orphaned node '${node.id}' (parent missing for path ${node.path.join('.')})`
        );
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
   * Detect output changes after deployment by comparing previous and current CloudDOM
   * This is called after deployment to identify which provider outputs have changed
   * 
   * @param previous - Previous CloudDOM state
   * @param current - Current CloudDOM state after deployment
   * @returns Array of output changes detected
   */
  detectOutputChanges(previous: CloudDOMNode[], current: CloudDOMNode[]): OutputChange[] {
    const changes: OutputChange[] = [];

    // Build maps for efficient lookup
    const previousMap = this.toFlatMap(previous);
    const currentMap = this.toFlatMap(current);

    // Check for changed outputs in existing nodes
    for (const [nodeId, currentNode] of Object.entries(currentMap)) {
      const previousNode = previousMap[nodeId];

      if (previousNode && currentNode.outputs && previousNode.outputs) {
        // Compare outputs
        for (const [outputKey, currentValue] of Object.entries(currentNode.outputs)) {
          const previousValue = previousNode.outputs[outputKey];

          if (previousValue !== currentValue) {
            // Get affected fibers from provider output tracker
            const affectedFibers = this.providerOutputTracker
              ? Array.from(this.providerOutputTracker.getBindingsForInstance(nodeId))
              : [];

            changes.push({
              nodeId,
              outputKey,
              previousValue,
              newValue: currentValue,
              affectedFibers
            });
          }
        }

        // Check for removed outputs
        for (const [outputKey, previousValue] of Object.entries(previousNode.outputs)) {
          if (!(outputKey in currentNode.outputs)) {
            const affectedFibers = this.providerOutputTracker
              ? Array.from(this.providerOutputTracker.getBindingsForInstance(nodeId))
              : [];

            changes.push({
              nodeId,
              outputKey,
              previousValue,
              newValue: undefined,
              affectedFibers
            });
          }
        }
      }

      // Check for new outputs in new nodes
      if (!previousNode && currentNode.outputs) {
        for (const [outputKey, currentValue] of Object.entries(currentNode.outputs)) {
          const affectedFibers = this.providerOutputTracker
            ? Array.from(this.providerOutputTracker.getBindingsForInstance(nodeId))
            : [];

          changes.push({
            nodeId,
            outputKey,
            previousValue: undefined,
            newValue: currentValue,
            affectedFibers
          });
        }
      }
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
      console.warn('[CloudDOMBuilder] Reactive components not set, skipping output sync');
      return [];
    }

    try {
      // Step 1: Update provider output tracker with new outputs
      const outputChanges: OutputChange[] = [];

      for (const node of cloudDOM) {
        if (node.outputs) {
          const nodeChanges = this.providerOutputTracker.updateNodeOutputs(node.id, node.outputs);
          outputChanges.push(...nodeChanges);
        }
      }

      // Step 2: If we have previous state, detect additional changes
      if (previousCloudDOM) {
        const additionalChanges = this.detectOutputChanges(previousCloudDOM, cloudDOM);

        // Merge changes, avoiding duplicates
        for (const change of additionalChanges) {
          const exists = outputChanges.some(
            existing => existing.nodeId === change.nodeId && existing.outputKey === change.outputKey
          );
          if (!exists) {
            outputChanges.push(change);
          }
        }
      }

      // Step 3: Apply output changes to bound state
      const affectedFibers = this.applyOutputChangesToState(outputChanges);

      // Debug logging
      if (process.env.CREACT_DEBUG === 'true') {
        console.debug(`[CloudDOMBuilder] Synced ${outputChanges.length} output changes, affected ${affectedFibers.length} fibers`);
      }

      return affectedFibers;

    } catch (error) {
      console.error('[CloudDOMBuilder] Error during output synchronization:', error);
      return [];
    }
  }

  /**
   * Apply output changes to bound state using StateBindingManager
   * This updates useState values that are bound to provider outputs
   * 
   * @param changes - Array of output changes to apply
   * @returns Array of fibers affected by the changes
   */
  applyOutputChangesToState(changes: OutputChange[]): FiberNode[] {
    if (!this.stateBindingManager) {
      return [];
    }

    try {
      // Process changes through state binding manager
      const affectedFibers = this.stateBindingManager.processOutputChanges(changes);

      // Also notify provider output tracker about the changes
      if (this.providerOutputTracker) {
        this.providerOutputTracker.processOutputChanges(changes);
      }

      return affectedFibers;

    } catch (error) {
      console.error('[CloudDOMBuilder] Error applying output changes to state:', error);
      return [];
    }
  }

  /**
   * Integrate with post-deployment effects to trigger output synchronization
   * This method should be called after deployment completes
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
    // First execute the existing post-deployment effects
    await this.executePostDeploymentEffects(fiber);

    // Then sync outputs and trigger re-renders
    const affectedFibers = await this.syncOutputsAndReRender(fiber, cloudDOM, previousCloudDOM);

    // Finally sync any state changes back to CloudDOM
    this.syncFiberStateToCloudDOM(fiber, cloudDOM);

    return affectedFibers;
  }
}
