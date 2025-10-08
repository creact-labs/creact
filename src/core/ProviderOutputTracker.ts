import { FiberNode, CloudDOMNode, CReactEvents, OutputChange } from './types';

/**
 * ProviderOutputTracker - Tracks useInstance calls and their output dependencies
 * 
 * Key Features:
 * - Track useInstance calls and their output dependencies
 * - Implement output change detection
 * - Event hook integration for tooling
 * - Notify bound components when outputs change
 */
export class ProviderOutputTracker {
  private instanceBindings = new Map<string, Set<FiberNode>>();
  private nodeOutputs = new Map<string, Record<string, any>>();
  private eventHooks?: CReactEvents;

  constructor(eventHooks?: CReactEvents) {
    this.eventHooks = eventHooks;
  }

  /**
   * Track a useInstance call and bind it to the calling fiber
   * This is called from useInstance when a CloudDOM node is created
   */
  trackInstance(node: CloudDOMNode, fiber: FiberNode): void {
    if (!this.instanceBindings.has(node.id)) {
      this.instanceBindings.set(node.id, new Set());
    }
    this.instanceBindings.get(node.id)!.add(fiber);

    // Initialize outputs tracking for this node
    if (!this.nodeOutputs.has(node.id)) {
      this.nodeOutputs.set(node.id, {});
    }
  }

  /**
   * Get all fibers that are bound to a specific instance
   */
  getBindingsForInstance(nodeId: string): Set<FiberNode> {
    return this.instanceBindings.get(nodeId) || new Set();
  }

  /**
   * Update outputs for a specific node and detect changes
   * This is called after deployment when provider outputs are available
   */
  updateNodeOutputs(nodeId: string, newOutputs: Record<string, any>): OutputChange[] {
    const previousOutputs = this.nodeOutputs.get(nodeId) || {};
    const changes: OutputChange[] = [];

    // Detect changes in outputs
    for (const [outputKey, newValue] of Object.entries(newOutputs)) {
      const previousValue = previousOutputs[outputKey];
      
      if (previousValue !== newValue) {
        const boundFibers = Array.from(this.getBindingsForInstance(nodeId));
        
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
        const boundFibers = Array.from(this.getBindingsForInstance(nodeId));
        
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
    this.nodeOutputs.set(nodeId, { ...newOutputs });

    return changes;
  }

  /**
   * Notify about output changes and trigger appropriate events
   * This integrates with the event hooks system
   */
  notifyOutputChange(nodeId: string, outputKey: string, newValue: any, previousValue: any): void {
    const boundFibers = this.getBindingsForInstance(nodeId);
    
    Array.from(boundFibers).forEach(fiber => {
      try {
        // Emit render start event for affected fiber
        this.eventHooks?.onRenderStart(fiber);
        
        // Update reactive state if available
        if (fiber.reactiveState) {
          fiber.reactiveState.lastRenderReason = 'output-update';
          fiber.reactiveState.lastRenderTime = Date.now();
          fiber.reactiveState.isDirty = true;
        }
        
      } catch (error) {
        this.eventHooks?.onError(error as Error, fiber);
      }
    });
  }

  /**
   * Process multiple output changes and return all affected fibers
   * This is used by the deployment system to batch process changes
   */
  processOutputChanges(changes: OutputChange[]): Set<FiberNode> {
    const allAffectedFibers = new Set<FiberNode>();

    for (const change of changes) {
      // Notify about the change
      this.notifyOutputChange(
        change.nodeId,
        change.outputKey,
        change.newValue,
        change.previousValue
      );

      // Collect affected fibers
      change.affectedFibers.forEach(fiber => allAffectedFibers.add(fiber));
    }

    return allAffectedFibers;
  }

  /**
   * Get current outputs for a specific node
   */
  getNodeOutputs(nodeId: string): Record<string, any> {
    return { ...this.nodeOutputs.get(nodeId) || {} };
  }

  /**
   * Check if a node has any tracked outputs
   */
  hasOutputs(nodeId: string): boolean {
    const outputs = this.nodeOutputs.get(nodeId);
    return outputs ? Object.keys(outputs).length > 0 : false;
  }

  /**
   * Remove tracking for a specific fiber (cleanup)
   */
  removeBindingsForFiber(fiber: FiberNode): void {
    Array.from(this.instanceBindings.entries()).forEach(([nodeId, fibers]) => {
      if (fibers.has(fiber)) {
        fibers.delete(fiber);
        
        // Clean up empty sets
        if (fibers.size === 0) {
          this.instanceBindings.delete(nodeId);
          this.nodeOutputs.delete(nodeId);
        }
      }
    });
  }

  /**
   * Remove tracking for a specific node (when resource is deleted)
   */
  removeBindingsForNode(nodeId: string): void {
    this.instanceBindings.delete(nodeId);
    this.nodeOutputs.delete(nodeId);
  }

  /**
   * Validate all tracked instances and remove invalid ones
   * This should be called periodically to clean up stale bindings
   */
  validateBindings(validNodes: Set<string>): void {
    const invalidNodes: string[] = [];

    // Find invalid nodes
    Array.from(this.instanceBindings.keys()).forEach(nodeId => {
      if (!validNodes.has(nodeId)) {
        invalidNodes.push(nodeId);
      }
    });

    // Remove invalid nodes
    invalidNodes.forEach(nodeId => {
      this.removeBindingsForNode(nodeId);
    });
  }

  /**
   * Get all tracked instances for debugging/inspection
   */
  getAllBindings(): Map<string, Array<{ fiber: FiberNode; outputs: Record<string, any> }>> {
    const result = new Map<string, Array<{ fiber: FiberNode; outputs: Record<string, any> }>>();

    Array.from(this.instanceBindings.entries()).forEach(([nodeId, fibers]) => {
      const outputs = this.getNodeOutputs(nodeId);
      const bindingList = Array.from(fibers).map(fiber => ({ fiber, outputs }));
      
      if (bindingList.length > 0) {
        result.set(nodeId, bindingList);
      }
    });

    return result;
  }

  /**
   * Get statistics about current bindings
   */
  getBindingStats(): {
    totalInstances: number;
    boundFibers: number;
    totalOutputs: number;
  } {
    let totalOutputs = 0;
    let boundFibers = 0;

    Array.from(this.instanceBindings.values()).forEach(fibers => {
      boundFibers += fibers.size;
    });

    Array.from(this.nodeOutputs.values()).forEach(outputs => {
      totalOutputs += Object.keys(outputs).length;
    });

    return {
      totalInstances: this.instanceBindings.size,
      boundFibers,
      totalOutputs
    };
  }

  /**
   * Clear all bindings (for testing/cleanup)
   */
  clearAllBindings(): void {
    this.instanceBindings.clear();
    this.nodeOutputs.clear();
  }

  /**
   * Create a provider output reference that can be used for automatic binding
   * This creates a special object that StateBindingManager can detect
   */
  createOutputReference(nodeId: string, outputKey: string, value: any): any {
    // Create a wrapper object with metadata for automatic binding detection
    if (value && typeof value === 'object') {
      return {
        ...value,
        __providerOutput: {
          nodeId,
          outputKey
        }
      };
    }

    // For primitive values, create a wrapper object
    return {
      value,
      __providerOutput: {
        nodeId,
        outputKey
      },
      // Make it behave like the primitive value
      valueOf: () => value,
      toString: () => String(value)
    };
  }

  /**
   * Extract output references from CloudDOM nodes
   * This is used to create output references for useState binding
   */
  extractOutputReferences(node: CloudDOMNode): Record<string, any> {
    const references: Record<string, any> = {};

    // Extract outputs from the node if available
    if (node.outputs) {
      for (const [outputKey, value] of Object.entries(node.outputs)) {
        references[outputKey] = this.createOutputReference(node.id, outputKey, value);
      }
    }

    return references;
  }
}