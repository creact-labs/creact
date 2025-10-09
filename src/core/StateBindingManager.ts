import { FiberNode, OutputBinding, OutputChange } from './types';
import { generateBindingKey, parseBindingKey } from '../utils/naming';

/**
 * StateBindingManager - Manages automatic binding between component state and provider outputs
 * 
 * Key Features:
 * - Automatic binding detection when setState is called with provider outputs
 * - State update propagation when provider outputs change
 * - Binding validation and cleanup
 * - Tracks which state variables are bound to which provider outputs
 */
export class StateBindingManager {
  private stateBindings = new WeakMap<FiberNode, Map<number, OutputBinding>>();
  private outputToBindings = new Map<string, Set<{ fiber: FiberNode; hookIndex: number }>>();

  /**
   * Automatically bind state to output when setState is called with a provider output value
   * This is called internally when setState detects it's being set to a provider output
   */
  bindStateToOutput(
    fiber: FiberNode, 
    hookIndex: number, 
    nodeId: string, 
    outputKey: string, 
    initialValue: any
  ): void {
    // Initialize fiber bindings if not exists
    if (!this.stateBindings.has(fiber)) {
      this.stateBindings.set(fiber, new Map());
    }

    // Create the binding
    const binding: OutputBinding = {
      nodeId,
      outputKey,
      lastValue: initialValue,
      bindTime: Date.now()
    };

    // Store the binding
    this.stateBindings.get(fiber)!.set(hookIndex, binding);

    // Create reverse mapping for efficient lookups
    const bindingKey = generateBindingKey(nodeId, outputKey);
    if (!this.outputToBindings.has(bindingKey)) {
      this.outputToBindings.set(bindingKey, new Set());
    }
    this.outputToBindings.get(bindingKey)!.add({ fiber, hookIndex });
  }

  /**
   * Check if a specific state hook is bound to a provider output
   */
  isStateBoundToOutput(fiber: FiberNode, hookIndex: number): boolean {
    const fiberBindings = this.stateBindings.get(fiber);
    return fiberBindings?.has(hookIndex) ?? false;
  }

  /**
   * Get the output binding for a specific state hook
   */
  getStateBinding(fiber: FiberNode, hookIndex: number): OutputBinding | undefined {
    return this.stateBindings.get(fiber)?.get(hookIndex);
  }

  /**
   * Update bound state when provider outputs change
   * Returns list of fibers that were affected by the change
   * 
   * REQ-4.2, 4.4, 4.5: Use internal setState to prevent circular dependencies
   */
  updateBoundState(nodeId: string, outputKey: string, newValue: any): FiberNode[] {
    const bindingKey = generateBindingKey(nodeId, outputKey);
    const bindings = this.outputToBindings.get(bindingKey);
    
    if (!bindings) {
      return []; // No bindings for this output
    }

    const affectedFibers: FiberNode[] = [];

    Array.from(bindings).forEach(({ fiber, hookIndex }) => {
      const binding = this.stateBindings.get(fiber)?.get(hookIndex);
      
      if (!binding) {
        return; // Binding was removed
      }

      // Only update if value actually changed
      if (binding.lastValue !== newValue) {
        // REQ-4.2, 4.4: Use stored setState callback with isInternalUpdate=true
        // This prevents infinite binding loops
        const setStateCallbacks = (fiber as any).setStateCallbacks;
        
        if (setStateCallbacks && setStateCallbacks[hookIndex]) {
          try {
            // Call setState with isInternalUpdate=true to skip binding creation
            setStateCallbacks[hookIndex](newValue, true);
            
            binding.lastValue = newValue;
            binding.lastUpdate = Date.now();
            affectedFibers.push(fiber);
            
            if (process.env.CREACT_DEBUG === 'true') {
              console.debug(`[StateBindingManager] Updated bound state via internal setState: ${bindingKey}`);
            }
          } catch (error) {
            console.error(`[StateBindingManager] Error calling internal setState for ${bindingKey}:`, error);
            // REQ-4.5: Fallback to direct hook update if callback fails
            this.fallbackDirectUpdate(fiber, hookIndex, newValue, binding, affectedFibers);
          }
        } else {
          // REQ-4.5: Fallback to direct hook update if callback not available
          if (process.env.CREACT_DEBUG === 'true') {
            console.debug(`[StateBindingManager] No setState callback found, using direct update: ${bindingKey}`);
          }
          this.fallbackDirectUpdate(fiber, hookIndex, newValue, binding, affectedFibers);
        }
      }
    });

    return affectedFibers;
  }

  /**
   * Fallback method for direct hook update when setState callback is not available
   * REQ-4.5: Proper error handling and recovery
   * 
   * @private
   */
  private fallbackDirectUpdate(
    fiber: FiberNode,
    hookIndex: number,
    newValue: any,
    binding: OutputBinding,
    affectedFibers: FiberNode[]
  ): void {
    if (fiber.hooks && fiber.hooks[hookIndex] !== newValue) {
      fiber.hooks[hookIndex] = newValue;
      binding.lastValue = newValue;
      binding.lastUpdate = Date.now();
      affectedFibers.push(fiber);
    }
  }

  /**
   * Detect if a value is a provider output by checking if it has output-like properties
   * This is used for automatic binding detection
   */
  isProviderOutput(value: any): { nodeId: string; outputKey: string } | null {
    // Check if value has provider output metadata
    if (value && typeof value === 'object' && value.__providerOutput) {
      return {
        nodeId: value.__providerOutput.nodeId,
        outputKey: value.__providerOutput.outputKey
      };
    }

    // Check if value is a CloudDOMNode output reference
    if (value && typeof value === 'object' && value.__cloudDOMOutput) {
      return {
        nodeId: value.__cloudDOMOutput.nodeId,
        outputKey: value.__cloudDOMOutput.outputKey
      };
    }

    return null;
  }

  /**
   * Process output changes and return affected fibers
   * This is called after deployment when provider outputs change
   * Includes error isolation so one faulty fiber doesn't block the whole batch
   */
  processOutputChanges(changes: OutputChange[]): FiberNode[] {
    const allAffectedFibers = new Set<FiberNode>();

    for (const change of changes) {
      try {
        const affectedFibers = this.updateBoundState(
          change.nodeId,
          change.outputKey,
          change.newValue
        );

        affectedFibers.forEach(fiber => allAffectedFibers.add(fiber));
      } catch (err) {
        console.warn(
          `Error updating bound state for ${change.nodeId}.${change.outputKey}:`, 
          err
        );
        // Continue processing other changes even if one fails
      }
    }

    return Array.from(allAffectedFibers);
  }

  /**
   * Remove bindings for a specific fiber (cleanup)
   * Note: With WeakMap, the fiber binding will be automatically garbage collected
   * when the fiber is no longer referenced. This method cleans up reverse mappings.
   */
  removeBindingsForFiber(fiber: FiberNode): void {
    const fiberBindings = this.stateBindings.get(fiber);
    
    if (!fiberBindings) {
      return;
    }

    // Remove from reverse mappings
    Array.from(fiberBindings.entries()).forEach(([hookIndex, binding]) => {
      const bindingKey = generateBindingKey(binding.nodeId, binding.outputKey);
      const bindings = this.outputToBindings.get(bindingKey);
      
      if (bindings) {
        // Find and remove the specific binding
        Array.from(bindings).forEach(bindingRef => {
          if (bindingRef.fiber === fiber && bindingRef.hookIndex === hookIndex) {
            bindings.delete(bindingRef);
          }
        });

        // Clean up empty sets
        if (bindings.size === 0) {
          this.outputToBindings.delete(bindingKey);
        }
      }
    });

    // Remove fiber bindings
    this.stateBindings.delete(fiber);
  }

  /**
   * Remove bindings for a specific output (when resource is deleted)
   */
  removeBindingsForOutput(nodeId: string, outputKey: string): void {
    const bindingKey = generateBindingKey(nodeId, outputKey);
    const bindings = this.outputToBindings.get(bindingKey);
    
    if (!bindings) {
      return;
    }

    // Remove from fiber bindings
    Array.from(bindings).forEach(({ fiber, hookIndex }) => {
      const fiberBindings = this.stateBindings.get(fiber);
      if (fiberBindings) {
        fiberBindings.delete(hookIndex);
        
        // Clean up empty fiber bindings
        if (fiberBindings.size === 0) {
          this.stateBindings.delete(fiber);
        }
      }
    });

    // Remove reverse mapping
    this.outputToBindings.delete(bindingKey);
  }

  /**
   * Validate all bindings and remove invalid ones
   * This should be called periodically to clean up stale bindings
   */
  validateBindings(validNodes: Set<string>): void {
    const invalidBindings: Array<{ nodeId: string; outputKey: string }> = [];

    // Find invalid bindings
    Array.from(this.outputToBindings.keys()).forEach(bindingKey => {
      const { nodeId, outputKey } = parseBindingKey(bindingKey);
      if (!validNodes.has(nodeId)) {
        invalidBindings.push({ nodeId, outputKey });
      }
    });

    // Remove invalid bindings
    for (const { nodeId, outputKey } of invalidBindings) {
      this.removeBindingsForOutput(nodeId, outputKey);
    }
  }

  /**
   * Get all bindings for debugging/inspection
   */
  getAllBindings(): Map<string, Array<{ fiber: FiberNode; hookIndex: number; binding: OutputBinding }>> {
    const result = new Map<string, Array<{ fiber: FiberNode; hookIndex: number; binding: OutputBinding }>>();

    Array.from(this.outputToBindings.entries()).forEach(([bindingKey, bindings]) => {
      const bindingList: Array<{ fiber: FiberNode; hookIndex: number; binding: OutputBinding }> = [];

      Array.from(bindings).forEach(({ fiber, hookIndex }) => {
        const binding = this.stateBindings.get(fiber)?.get(hookIndex);
        if (binding) {
          bindingList.push({ fiber, hookIndex, binding });
        }
      });

      if (bindingList.length > 0) {
        result.set(bindingKey, bindingList);
      }
    });

    return result;
  }

  /**
   * Get statistics about current bindings
   * Note: With WeakMap, we can't directly count bound fibers, so we estimate from reverse mappings
   */
  getBindingStats(): {
    totalBindings: number;
    boundFibers: number;
    boundOutputs: number;
  } {
    let totalBindings = 0;
    const uniqueFibers = new Set<FiberNode>();
    
    // Count bindings and unique fibers from reverse mappings
    Array.from(this.outputToBindings.values()).forEach(bindings => {
      totalBindings += bindings.size;
      Array.from(bindings).forEach(({ fiber }) => {
        uniqueFibers.add(fiber);
      });
    });

    return {
      totalBindings,
      boundFibers: uniqueFibers.size,
      boundOutputs: this.outputToBindings.size
    };
  }

  /**
   * Clear all bindings (for testing/cleanup)
   * Note: WeakMap doesn't have clear(), so we clear the reverse mappings only
   */
  clearAllBindings(): void {
    // WeakMap doesn't have clear() method, but clearing outputToBindings
    // will effectively orphan all the WeakMap entries for GC
    this.outputToBindings.clear();
  }
}