import { FiberNode, CloudDOMNode, CReactEvents, OutputChange } from './types';
import { LoggerFactory } from '../utils/Logger';

const logger = LoggerFactory.getLogger('hooks');

/**
 * Access tracking session for dependency analysis
 * REQ-6.2, 6.3, 6.4: Track output reads during component execution
 */
interface AccessTrackingSession {
  fiber: FiberNode;
  startTime: number;
  trackedOutputs: Set<string>; // Set of binding keys (nodeId.outputKey)
  isActive: boolean;
}

/**
 * ProviderOutputTracker - Tracks useInstance calls and their output dependencies
 * 
 * Key Features:
 * - Track which components use which provider instances
 * - Detect when provider outputs change
 * - Notify bound components of output changes
 * - Event hook integration for tooling and debugging
 * - REQ-6.2, 6.3, 6.4: Track output reads for automatic binding creation
 */
export class ProviderOutputTracker {
  private instanceBindings = new Map<string, Set<FiberNode>>();
  private instanceOutputs = new Map<string, Record<string, any>>();
  private eventHooks?: CReactEvents;
  
  // REQ-6.2, 6.3: Access tracking sessions for dependency analysis
  private activeSessions = new Map<FiberNode, AccessTrackingSession>();

  constructor(eventHooks?: CReactEvents) {
    this.eventHooks = eventHooks;
  }

  /**
   * Track a useInstance call - bind a fiber to a CloudDOM node
   * This is called whenever useInstance is called in a component
   */
  trackInstance(node: CloudDOMNode, fiber: FiberNode): void {
    // Initialize bindings for this instance if not exists
    if (!this.instanceBindings.has(node.id)) {
      this.instanceBindings.set(node.id, new Set());
    }

    // Add the fiber to the bindings
    this.instanceBindings.get(node.id)!.add(fiber);

    // Store initial outputs if available
    if (node.outputs) {
      this.instanceOutputs.set(node.id, { ...node.outputs });
    }
  }

  /**
   * Get all fibers bound to a specific instance
   */
  getBindingsForInstance(nodeId: string): Set<FiberNode> {
    return this.instanceBindings.get(nodeId) || new Set();
  }

  /**
   * Update outputs for an instance and detect changes
   * Returns array of output changes that occurred
   */
  updateInstanceOutputs(nodeId: string, newOutputs: Record<string, any>): OutputChange[] {
    const previousOutputs = this.instanceOutputs.get(nodeId) || {};
    const changes: OutputChange[] = [];
    const boundFibers = Array.from(this.getBindingsForInstance(nodeId));

    // Check for changed outputs
    for (const [outputKey, newValue] of Object.entries(newOutputs)) {
      const previousValue = previousOutputs[outputKey];
      
      if (previousValue !== newValue) {
        changes.push({
          nodeId,
          outputKey,
          previousValue,
          newValue,
          affectedFibers: boundFibers
        });
      }
    }

    // Check for removed outputs
    for (const [outputKey, previousValue] of Object.entries(previousOutputs)) {
      if (!(outputKey in newOutputs)) {
        changes.push({
          nodeId,
          outputKey,
          previousValue,
          newValue: undefined,
          affectedFibers: boundFibers
        });
      }
    }

    // Update stored outputs
    this.instanceOutputs.set(nodeId, { ...newOutputs });

    return changes;
  }

  /**
   * Notify bound components of output changes
   * This triggers re-renders for affected components
   */
  notifyOutputChanges(changes: OutputChange[]): void {
    for (const change of changes) {
      const boundFibers = this.getBindingsForInstance(change.nodeId);
      
      for (const fiber of boundFibers) {
        try {
          // Emit render start event for tooling
          this.eventHooks?.onRenderStart(fiber);
          
          // Mark fiber as needing re-render due to output change
          if (!fiber.reactiveState) {
            fiber.reactiveState = {
              renderCount: 0,
              isDirty: true,
              updatePending: true,
              lastRenderReason: 'output-update',
              lastRenderTime: Date.now()
            };
          } else {
            fiber.reactiveState.lastRenderReason = 'output-update';
            fiber.reactiveState.lastRenderTime = Date.now();
            fiber.reactiveState.isDirty = true;
            fiber.reactiveState.updatePending = true;
          }
          
        } catch (error) {
          this.eventHooks?.onError(error as Error, fiber);
        }
      }
    }
  }

  /**
   * Process a batch of CloudDOM nodes and detect all output changes
   * This is typically called after deployment completes
   */
  processCloudDOMOutputs(nodes: CloudDOMNode[]): OutputChange[] {
    const allChanges: OutputChange[] = [];

    for (const node of nodes) {
      if (node.outputs) {
        const changes = this.updateInstanceOutputs(node.id, node.outputs);
        allChanges.push(...changes);
      }

      // Process child nodes recursively
      if (node.children && node.children.length > 0) {
        const childChanges = this.processCloudDOMOutputs(node.children);
        allChanges.push(...childChanges);
      }
    }

    return allChanges;
  }

  /**
   * Remove bindings for a specific fiber (cleanup)
   */
  removeBindingsForFiber(fiber: FiberNode): void {
    for (const [nodeId, bindings] of this.instanceBindings) {
      bindings.delete(fiber);
      
      // Clean up empty binding sets
      if (bindings.size === 0) {
        this.instanceBindings.delete(nodeId);
        this.instanceOutputs.delete(nodeId);
      }
    }
  }

  /**
   * Remove bindings for a specific instance (when resource is deleted)
   */
  removeBindingsForInstance(nodeId: string): void {
    this.instanceBindings.delete(nodeId);
    this.instanceOutputs.delete(nodeId);
  }

  /**
   * Validate bindings and remove invalid ones
   * This should be called periodically to clean up stale bindings
   */
  validateBindings(validNodes: Set<string>): void {
    const invalidNodeIds: string[] = [];

    for (const nodeId of this.instanceBindings.keys()) {
      if (!validNodes.has(nodeId)) {
        invalidNodeIds.push(nodeId);
      }
    }

    // Remove invalid bindings
    for (const nodeId of invalidNodeIds) {
      this.removeBindingsForInstance(nodeId);
    }
  }

  /**
   * Get current outputs for an instance
   */
  getInstanceOutputs(nodeId: string): Record<string, any> | undefined {
    return this.instanceOutputs.get(nodeId);
  }

  /**
   * Check if an instance has any bound components
   */
  hasBindings(nodeId: string): boolean {
    const bindings = this.instanceBindings.get(nodeId);
    return bindings ? bindings.size > 0 : false;
  }

  /**
   * Get all tracked instances
   */
  getTrackedInstances(): string[] {
    return Array.from(this.instanceBindings.keys());
  }

  /**
   * Get statistics about current bindings
   */
  getBindingStats(): {
    totalInstances: number;
    totalBindings: number;
    instancesWithOutputs: number;
  } {
    let totalBindings = 0;
    
    for (const bindings of this.instanceBindings.values()) {
      totalBindings += bindings.size;
    }

    return {
      totalInstances: this.instanceBindings.size,
      totalBindings,
      instancesWithOutputs: this.instanceOutputs.size
    };
  }

  /**
   * Get all bindings for debugging/inspection
   */
  getAllBindings(): Map<string, { 
    fibers: FiberNode[]; 
    outputs: Record<string, any> | undefined;
  }> {
    const result = new Map<string, { 
      fibers: FiberNode[]; 
      outputs: Record<string, any> | undefined;
    }>();

    for (const [nodeId, bindings] of this.instanceBindings) {
      result.set(nodeId, {
        fibers: Array.from(bindings),
        outputs: this.instanceOutputs.get(nodeId)
      });
    }

    return result;
  }

  /**
   * Clear all bindings (for testing/cleanup)
   */
  clearAllBindings(): void {
    this.instanceBindings.clear();
    this.instanceOutputs.clear();
  }

  /**
   * Create a snapshot of current state for comparison
   * Useful for detecting changes between deployments
   */
  createSnapshot(): {
    bindings: Map<string, string[]>; // nodeId -> fiber paths
    outputs: Map<string, Record<string, any>>;
  } {
    const bindingsSnapshot = new Map<string, string[]>();
    const outputsSnapshot = new Map<string, Record<string, any>>();

    // Create bindings snapshot with fiber paths instead of fiber objects
    for (const [nodeId, fibers] of this.instanceBindings) {
      bindingsSnapshot.set(nodeId, Array.from(fibers).map(f => f.path.join('.')));
    }

    // Create outputs snapshot
    for (const [nodeId, outputs] of this.instanceOutputs) {
      outputsSnapshot.set(nodeId, { ...outputs });
    }

    return {
      bindings: bindingsSnapshot,
      outputs: outputsSnapshot
    };
  }

  /**
   * Compare with a previous snapshot to detect changes
   */
  compareWithSnapshot(snapshot: {
    bindings: Map<string, string[]>;
    outputs: Map<string, Record<string, any>>;
  }): {
    bindingChanges: { added: string[]; removed: string[]; modified: string[] };
    outputChanges: OutputChange[];
  } {
    const bindingChanges = {
      added: [] as string[],
      removed: [] as string[],
      modified: [] as string[]
    };
    const outputChanges: OutputChange[] = [];

    // Check for binding changes
    const currentNodeIds = new Set(this.instanceBindings.keys());
    const snapshotNodeIds = new Set(snapshot.bindings.keys());

    // Added instances
    for (const nodeId of currentNodeIds) {
      if (!snapshotNodeIds.has(nodeId)) {
        bindingChanges.added.push(nodeId);
      }
    }

    // Removed instances
    for (const nodeId of snapshotNodeIds) {
      if (!currentNodeIds.has(nodeId)) {
        bindingChanges.removed.push(nodeId);
      }
    }

    // Modified instances (binding changes)
    for (const nodeId of currentNodeIds) {
      if (snapshotNodeIds.has(nodeId)) {
        const currentPaths = Array.from(this.instanceBindings.get(nodeId)!).map(f => f.path.join('.'));
        const snapshotPaths = snapshot.bindings.get(nodeId)!;
        
        if (JSON.stringify(currentPaths.sort()) !== JSON.stringify(snapshotPaths.sort())) {
          bindingChanges.modified.push(nodeId);
        }
      }
    }

    // Check for output changes
    for (const nodeId of currentNodeIds) {
      const currentOutputs = this.instanceOutputs.get(nodeId) || {};
      const snapshotOutputs = snapshot.outputs.get(nodeId) || {};
      
      const changes = this.compareOutputs(nodeId, snapshotOutputs, currentOutputs);
      outputChanges.push(...changes);
    }

    return { bindingChanges, outputChanges };
  }

  /**
   * Compare two output objects and return changes
   */
  private compareOutputs(
    nodeId: string, 
    previousOutputs: Record<string, any>, 
    currentOutputs: Record<string, any>
  ): OutputChange[] {
    const changes: OutputChange[] = [];
    const boundFibers = Array.from(this.getBindingsForInstance(nodeId));

    // Check for changed/added outputs
    for (const [outputKey, currentValue] of Object.entries(currentOutputs)) {
      const previousValue = previousOutputs[outputKey];
      
      if (previousValue !== currentValue) {
        changes.push({
          nodeId,
          outputKey,
          previousValue,
          newValue: currentValue,
          affectedFibers: boundFibers
        });
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
          affectedFibers: boundFibers
        });
      }
    }

    return changes;
  }

  /**
   * Extract output references for automatic state binding
   * Creates proxy objects that can be used to automatically bind state to outputs
   */
  extractOutputReferences(node: CloudDOMNode): Record<string, any> {
    const outputReferences: Record<string, any> = {};
    
    if (!node.outputs) {
      return outputReferences;
    }

    // Create output reference objects for each output
    for (const [outputKey, value] of Object.entries(node.outputs)) {
      outputReferences[outputKey] = {
        __providerOutput: {
          nodeId: node.id,
          outputKey,
          value
        },
        // Also include the actual value for direct access
        valueOf: () => value,
        toString: () => String(value),
        // Make it behave like the actual value in most contexts
        [Symbol.toPrimitive]: () => value
      };
    }

    return outputReferences;
  }

  /**
   * Update outputs for a specific node and return changes
   * This is an alias for updateInstanceOutputs for compatibility
   */
  updateNodeOutputs(nodeId: string, newOutputs: Record<string, any>): OutputChange[] {
    return this.updateInstanceOutputs(nodeId, newOutputs);
  }

  /**
   * Process output changes and return affected fibers
   * This is an alias for processCloudDOMOutputs for single node updates
   */
  processOutputChanges(changes: OutputChange[]): Set<FiberNode> {
    const affectedFibers = new Set<FiberNode>();
    
    for (const change of changes) {
      change.affectedFibers.forEach(fiber => affectedFibers.add(fiber));
    }
    
    // Notify about the changes
    this.notifyOutputChanges(changes);
    
    return affectedFibers;
  }

  /**
   * Get current outputs for a node
   * This is an alias for getInstanceOutputs for compatibility
   */
  getNodeOutputs(nodeId: string): Record<string, any> {
    return this.getInstanceOutputs(nodeId) || {};
  }

  /**
   * Start an access tracking session for a fiber
   * REQ-6.2, 6.3: Track which outputs are accessed during execution
   * 
   * @param fiber - Fiber node to track
   */
  startAccessTracking(fiber: FiberNode): void {
    this.activeSessions.set(fiber, {
      fiber,
      startTime: Date.now(),
      trackedOutputs: new Set(),
      isActive: true
    });

    logger.debug(`Started access tracking for ${fiber.path.join('.')}`);
  }

  /**
   * End an access tracking session and return tracked outputs
   * REQ-6.3, 6.4: Collect tracked outputs for binding creation
   * 
   * @param fiber - Fiber node to end tracking for
   * @returns Set of binding keys that were accessed
   */
  endAccessTracking(fiber: FiberNode): Set<string> {
    const session = this.activeSessions.get(fiber);
    if (!session) {
      return new Set();
    }

    session.isActive = false;
    this.activeSessions.delete(fiber);

    logger.debug(`Ended access tracking for ${fiber.path.join('.')}, tracked ${session.trackedOutputs.size} outputs`);

    return session.trackedOutputs;
  }

  /**
   * Track an output read during an active session
   * REQ-6.2, 6.4: Record when outputs are accessed for binding creation
   * 
   * @param nodeId - CloudDOM node ID
   * @param outputKey - Output key that was accessed
   * @param fiber - Fiber node that accessed the output
   */
  trackOutputRead(nodeId: string, outputKey: string, fiber: FiberNode): void {
    const session = this.activeSessions.get(fiber);
    if (session?.isActive) {
      // Generate binding key for this output
      const bindingKey = `${nodeId}.${outputKey}`;
      session.trackedOutputs.add(bindingKey);

      logger.debug(`Tracked output read: ${bindingKey} by ${fiber.path.join('.')}`);
    }
  }

  /**
   * Check if a fiber has an active tracking session
   * 
   * @param fiber - Fiber node to check
   * @returns True if tracking is active for this fiber
   */
  isTrackingActive(fiber: FiberNode): boolean {
    const session = this.activeSessions.get(fiber);
    return session?.isActive ?? false;
  }

  /**
   * Get all active tracking sessions (for debugging)
   */
  getActiveSessions(): AccessTrackingSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Clear all active tracking sessions (for cleanup/testing)
   */
  clearActiveSessions(): void {
    this.activeSessions.clear();
  }
}