// REQ-03: useEffect hook for infrastructure lifecycle management
// This hook manages side effects that run between deployment cycles

import {
  requireHookContext,
  incrementHookIndex,
} from './context';
import { FiberNode } from '../core/types';
import { generateBindingKey } from '../utils/naming';
import { getProviderOutputTrackerInstance } from './useInstance';
import { LoggerFactory } from '../utils/Logger';

const logger = LoggerFactory.getLogger('hooks');

/**
 * Effect function type - runs after deployment (supports async)
 */
export type EffectCallback = () => void | (() => void) | Promise<void | (() => void)>;

/**
 * Dependency array type - same as React
 */
export type DependencyList = ReadonlyArray<any>;

/**
 * Effect hook data stored in Fiber
 * REQ-5.1, 5.5: Enhanced dependency tracking and comparison
 */
interface EffectHook {
  callback: EffectCallback;
  deps: DependencyList | undefined;
  cleanup?: () => void;
  hasRun: boolean;
  // Reactive system integration
  boundOutputs?: Set<string>; // Track which provider outputs this effect depends on (using binding keys)
  lastDepsHash?: string; // Hash of dependencies for change detection
  lastDepsValues?: any[]; // REQ-5.5: Store actual dependency values for comparison
  isReactive?: boolean; // Whether this effect should respond to output changes
  // Debugging and tracing
  effectId?: string; // Unique ID for debugging and orchestrator logs
  // REQ-5.1, 5.5: Enhanced dependency comparison method
  hasDepChanged?(newDeps: any[]): boolean;
}

/**
 * useEffect hook - Infrastructure lifecycle management with reactive capabilities
 *
 * This hook manages side effects that run during infrastructure lifecycle events.
 * It integrates with the reactive system to respond to provider output changes.
 *
 * Infrastructure Lifecycle:
 * 1. **Build Phase**: Component renders, useEffect is registered
 * 2. **Deploy Phase**: Resources are materialized by cloud provider
 * 3. **Post-Deploy Phase**: useEffect callbacks run with real resource outputs
 * 4. **Reactive Phase**: Effects re-run when dependencies change (including provider outputs)
 * 5. **Destroy Phase**: Cleanup functions are called before stack destruction
 *
 * Behavior based on dependencies:
 * - **No dependencies (undefined)**: Runs on every deploy, cleanup on destroy
 * - **Empty dependencies ([])**: Runs once on first deploy, cleanup on destroy
 * - **With dependencies**: Runs when dependencies change, cleanup before re-run or destroy
 *
 * @param effect - Effect callback that runs after deployment
 * @param deps - Dependency array (same semantics as React)
 *
 * @example
 * ```tsx
 * function DatabaseStack() {
 *   const [dbUrl, setDbUrl] = useState<string>();
 *   const db = useInstance(PostgresDatabase, { name: 'my-db' });
 *
 *   // Runs on every deploy, cleanup on destroy
 *   useEffect(() => {
 *     logger.info('Database deployed');
 *     return () => logger.info('Database destroyed');
 *   });
 *
 *   // Runs when db.outputs.connectionUrl changes
 *   useEffect(() => {
 *     if (db.outputs?.connectionUrl) {
 *       setDbUrl(db.outputs.connectionUrl);
 *     }
 *   }, [db.outputs?.connectionUrl]);
 *
 *   return <DatabaseContext.Provider value={{ dbUrl }}>{children}</DatabaseContext.Provider>;
 * }
 * ```
 */
export function useEffect(effect: EffectCallback, deps?: DependencyList): void {
  // Use consolidated hook context
  const context = requireHookContext();
  const currentFiber = context.currentFiber!; // Non-null assertion safe due to requireHookContext validation

  // Initialize effects array in Fiber node if not already present
  if (!(currentFiber as any).effects) {
    (currentFiber as any).effects = [];
  }

  // Get current hook index and increment for next call (effect-specific)
  const currentHookIndex = incrementHookIndex('effect');

  // Analyze dependencies for provider output tracking
  const boundOutputs = new Set<string>();
  const isReactive = deps !== undefined && deps.length > 0;

  if (isReactive && deps) {
    // REQ-5.2, 5.3, 5.4: Start access tracking session before evaluating dependencies
    // This will track which outputs are actually accessed during dependency evaluation
    const outputTracker = getProviderOutputTrackerInstance();
    
    if (outputTracker) {
      outputTracker.startAccessTracking(currentFiber);
      
      if (process.env.CREACT_DEBUG === 'true') {
        logger.debug(`Started access tracking for dependency evaluation`);
      }
    }
    // REQ-5.3, 5.4: Access dependencies to trigger proxy tracking
    // This will record which outputs are actually read
    for (const dep of deps) {
      // Simply accessing the dependency triggers the proxy tracking
      // The proxy in useInstance will call outputTracker.trackOutputRead()
      void dep; // Access the dependency to trigger tracking
    }
    
    // REQ-5.3, 5.4: End access tracking session and collect tracked outputs
    if (outputTracker) {
      const trackedOutputs = outputTracker.endAccessTracking(currentFiber);
      
      // Add tracked outputs to boundOutputs
      trackedOutputs.forEach((bindingKey: string) => {
        boundOutputs.add(bindingKey);
      });
      
      if (process.env.CREACT_DEBUG === 'true') {
        logger.debug(`Tracked ${trackedOutputs.size} output accesses during dependency evaluation`);
        if (trackedOutputs.size > 0) {
          logger.debug(`Tracked outputs: ${Array.from(trackedOutputs).join(', ')}`);
        }
      }
    }
    
    // Track which CloudDOM nodes are referenced in this effect
    const referencedNodes = new Set<string>();
    
    // Get current fiber's CloudDOM nodes for reference tracking
    const fiberCloudDOMNodes = (currentFiber as any).cloudDOMNodes || [];
    const nodeMap = new Map<any, string>();
    
    // Build a map from node objects to their IDs
    for (const node of fiberCloudDOMNodes) {
      nodeMap.set(node, node.id);
    }
    
    // Analyze dependencies to find CloudDOM node references
    for (const dep of deps) {
      if (dep && typeof dep === 'object') {
        // Check if dependency is a provider output reference
        if (dep.__providerOutput) {
          const bindingKey = generateBindingKey(dep.__providerOutput.nodeId, dep.__providerOutput.outputKey);
          boundOutputs.add(bindingKey);

          if (process.env.CREACT_DEBUG === 'true') {
            logger.debug(`Detected provider output dependency: ${bindingKey}`);
          }
        }
        // Check if dependency is a CloudDOM output reference
        else if (dep.__cloudDOMOutput) {
          const bindingKey = generateBindingKey(dep.__cloudDOMOutput.nodeId, dep.__cloudDOMOutput.outputKey);
          boundOutputs.add(bindingKey);

          if (process.env.CREACT_DEBUG === 'true') {
            logger.debug(`Detected CloudDOM output dependency: ${bindingKey}`);
          }
        }
        // Check if dependency is a CloudDOM node (from useInstance)
        else if (nodeMap.has(dep)) {
          const nodeId = nodeMap.get(dep)!;
          referencedNodes.add(nodeId);
          
          if (process.env.CREACT_DEBUG === 'true') {
            logger.debug(`Detected CloudDOM node reference: ${nodeId}`);
          }
        }
      }
    }
    
    // For referenced nodes, bind to all their current and future outputs
    for (const nodeId of referencedNodes) {
      const node = fiberCloudDOMNodes.find((n: any) => n.id === nodeId);
      if (node) {
        // REQ-5.1, 5.2: Only bind to specific outputs that are actually accessed
        // No wildcard bindings - precise tracking only
        if (node.outputs) {
          for (const outputKey of Object.keys(node.outputs)) {
            const bindingKey = generateBindingKey(nodeId, outputKey);
            boundOutputs.add(bindingKey);
          }
        }
      }
    }

    if (process.env.CREACT_DEBUG === 'true' && boundOutputs.size > 0) {
      logger.debug(`Bound to ${boundOutputs.size} output patterns: ${Array.from(boundOutputs).join(', ')}`);
    }
  }

  // Generate dependency hash for change detection
  const depsHash = deps ? generateDependencyHash(deps) : undefined;

  // Generate unique effect ID for debugging and orchestrator logs
  const effectId = `${currentFiber.path.join('.')}:${currentHookIndex}`;

  // REQ-5.1, 5.5: Create enhanced dependency comparison method
  const hasDepChanged = function(this: EffectHook, newDeps: any[]): boolean {
    if (!this.lastDepsValues) return true;
    if (this.lastDepsValues.length !== newDeps.length) return true;
    
    return this.lastDepsValues.some((prev, i) => {
      const curr = newDeps[i];
      
      // REQ-5.5: Handle provider outputs specially
      if (isProviderOutput(prev) && isProviderOutput(curr)) {
        // Compare by nodeId and outputKey, not by value
        return prev.__providerOutput.nodeId !== curr.__providerOutput.nodeId ||
               prev.__providerOutput.outputKey !== curr.__providerOutput.outputKey;
      }
      
      // Handle CloudDOM outputs
      if (isCloudDOMOutput(prev) && isCloudDOMOutput(curr)) {
        return prev.__cloudDOMOutput.nodeId !== curr.__cloudDOMOutput.nodeId ||
               prev.__cloudDOMOutput.outputKey !== curr.__cloudDOMOutput.outputKey;
      }
      
      // Standard comparison for other values
      return prev !== curr;
    });
  };

  // Store effect data in Fiber node
  const effectHook: EffectHook = {
    callback: effect,
    deps,
    hasRun: false,
    boundOutputs: boundOutputs.size > 0 ? boundOutputs : undefined,
    lastDepsHash: depsHash,
    lastDepsValues: deps ? [...deps] : undefined, // REQ-5.5: Store actual values
    isReactive,
    effectId,
    hasDepChanged // REQ-5.1: Attach comparison method
  };

  (currentFiber as any).effects[currentHookIndex] = effectHook;

  // Register effect with reactive system if it has bound outputs
  if (boundOutputs.size > 0) {
    registerEffectWithReactiveSystem(currentFiber, currentHookIndex, boundOutputs);
  }
}

/**
 * Check if a value is a provider output
 * REQ-5.5: Helper for enhanced dependency comparison
 */
function isProviderOutput(value: any): boolean {
  return value && typeof value === 'object' && value.__providerOutput;
}

/**
 * Check if a value is a CloudDOM output
 * REQ-5.5: Helper for enhanced dependency comparison
 */
function isCloudDOMOutput(value: any): boolean {
  return value && typeof value === 'object' && value.__cloudDOMOutput;
}

/**
 * Generate a hash of dependencies for change detection using consistent naming
 */
function generateDependencyHash(deps: DependencyList): string {
  try {
    return JSON.stringify(deps.map(dep => {
      if (dep && typeof dep === 'object') {
        // For provider outputs, use binding key for stable representation
        if (dep.__providerOutput) {
          const bindingKey = generateBindingKey(dep.__providerOutput.nodeId, dep.__providerOutput.outputKey);
          return `__providerOutput:${bindingKey}`;
        }
        if (dep.__cloudDOMOutput) {
          const bindingKey = generateBindingKey(dep.__cloudDOMOutput.nodeId, dep.__cloudDOMOutput.outputKey);
          return `__cloudDOMOutput:${bindingKey}`;
        }
        // For other objects, try to create a stable hash
        return JSON.stringify(dep);
      }
      return dep;
    }));
  } catch (error) {
    // Fallback for non-serializable dependencies
    return `hash_error_${Date.now()}`;
  }
}

/**
 * Register effect with reactive system for output change notifications
 * Uses binding keys for consistent output tracking
 */
function registerEffectWithReactiveSystem(
  fiber: FiberNode,
  effectIndex: number,
  boundOutputs: Set<string>
): void {
  // This would integrate with the reactive system to notify when outputs change
  // For now, we store the binding information in the fiber for later use
  if (!fiber.effectBindings) {
    (fiber as any).effectBindings = new Map();
  }

  const bindingKeys = Array.from(boundOutputs);
  (fiber as any).effectBindings.set(effectIndex, {
    boundOutputs: bindingKeys, // These are already binding keys from generateBindingKey
    registeredAt: Date.now()
  });

  if (process.env.CREACT_DEBUG === 'true') {
    logger.debug(`Registered effect ${effectIndex} with reactive system for outputs: ${bindingKeys.join(', ')}`);
  }
}

/**
 * Check if effect dependencies have changed, including provider outputs
 * REQ-5.1, 5.5: Use enhanced dependency comparison
 */
function hasEffectDependenciesChanged(
  current: EffectHook,
  previous?: EffectHook,
  changedOutputs?: Set<string>
): boolean {
  // Always run on first execution
  if (!previous || !current.hasRun) {
    return true;
  }

  // No dependencies - run every deployment
  if (current.deps === undefined) {
    return true;
  }

  // Empty dependencies - run only once
  if (current.deps.length === 0) {
    return false;
  }

  // Check if any bound outputs have changed (using binding keys)
  if (current.boundOutputs && changedOutputs) {
    for (const boundOutputKey of current.boundOutputs) {
      if (changedOutputs.has(boundOutputKey)) {
        if (process.env.CREACT_DEBUG === 'true') {
          logger.debug(`Effect dependency changed: ${boundOutputKey}`);
        }
        return true;
      }
    }
  }

  // REQ-5.1, 5.5: Use enhanced dependency comparison if available
  if (current.hasDepChanged && current.deps) {
    return current.hasDepChanged([...current.deps]);
  }

  // Fallback: Compare dependency hash
  if (current.lastDepsHash !== previous.lastDepsHash) {
    return true;
  }

  // Fallback: Direct comparison
  if (!previous.deps || previous.deps.length !== current.deps.length) {
    return true;
  }

  for (let i = 0; i < current.deps.length; i++) {
    if (current.deps[i] !== previous.deps[i]) {
      return true;
    }
  }

  return false;
}

/**
 * Execute effects for a Fiber node after deployment
 * Called by CReact core after successful deployment
 *
 * @internal
 */
export function executeEffects(fiber: any, changedOutputs?: Set<string>): void {
  if (process.env.CREACT_DEBUG === 'true') {
    logger.debug(`executeEffects called for fiber: ${fiber.path?.join('.')}`);
    logger.debug(`Fiber has effects: ${!!(fiber.effects)}, length: ${fiber.effects?.length || 0}`);
    if (changedOutputs && changedOutputs.size > 0) {
      logger.debug(`Changed outputs: ${Array.from(changedOutputs).join(', ')}`);
    }
  }

  if (!fiber.effects || !Array.isArray(fiber.effects)) {
    if (process.env.CREACT_DEBUG === 'true') {
      logger.debug(`No effects found for fiber: ${fiber.path?.join('.')}`);
    }
    return;
  }

  if (process.env.CREACT_DEBUG === 'true') {
    logger.debug(`Executing ${fiber.effects.length} effects for fiber: ${fiber.path?.join('.')}`);
  }

  for (let i = 0; i < fiber.effects.length; i++) {
    const effectHook = fiber.effects[i] as EffectHook;

    if (!effectHook) {
      if (process.env.CREACT_DEBUG === 'true') {
        logger.debug(`Effect ${i} is null/undefined`);
      }
      continue;
    }

    // Check if effect should run based on dependencies and output changes
    const shouldRun = hasEffectDependenciesChanged(effectHook, fiber.previousEffects?.[i], changedOutputs);

    logger.debug(`Effect ${i} should run: ${shouldRun}`);
    if (effectHook.boundOutputs && effectHook.boundOutputs.size > 0) {
      logger.debug(`Effect ${i} bound to outputs: ${Array.from(effectHook.boundOutputs).join(', ')}`);
    }

    if (shouldRun) {
      // Run cleanup from previous effect if it exists
      if (effectHook.cleanup) {
        try {
          if (process.env.CREACT_DEBUG === 'true') {
            logger.debug(`Running cleanup for effect ${i}`);
          }
          effectHook.cleanup();
          effectHook.cleanup = undefined; // Clear cleanup after running
        } catch (error) {
          logger.error('Cleanup error:', error);
        }
      }

      // Run the effect with async support and tracing
      try {
        if (process.env.CREACT_DEBUG === 'true') {
          logger.debug(`Running effect ${effectHook.effectId || i}`);
        }
        
        const result = effectHook.callback();
        
        // Handle async effects
        if (result instanceof Promise) {
          result.then(cleanup => {
            if (typeof cleanup === 'function') {
              effectHook.cleanup = cleanup;
            }
            if (process.env.CREACT_DEBUG === 'true') {
              logger.debug(`Async effect ${effectHook.effectId || i} completed successfully`);
            }
          }).catch(error => {
            logger.error(`Async effect ${effectHook.effectId || i} error:`, error);
          });
        } else {
          // Handle sync effects
          if (typeof result === 'function') {
            effectHook.cleanup = result;
          }
          if (process.env.CREACT_DEBUG === 'true') {
            logger.debug(`Sync effect ${effectHook.effectId || i} completed successfully`);
          }
        }
        
        effectHook.hasRun = true;

        // REQ-5.5: Update dependency values and hash for next comparison
        if (effectHook.deps) {
          effectHook.lastDepsValues = [...effectHook.deps];
          effectHook.lastDepsHash = generateDependencyHash(effectHook.deps);
        }
      } catch (error) {
        logger.error(`Effect ${effectHook.effectId || i} error:`, error);
      }
    }
  }

  // Store current effects as previous for next deployment
  fiber.previousEffects = [...fiber.effects];
}

/**
 * Execute effects when provider outputs change (reactive execution)
 * Called by the reactive system when bound outputs change
 * 
 * @param fiber - Fiber node containing effects
 * @param changedOutputs - Set of output keys that changed
 * @internal
 */
export function executeEffectsOnOutputChange(fiber: any, changedOutputs: Set<string>): void {
  if (!fiber.effects || !Array.isArray(fiber.effects)) {
    return;
  }

  if (process.env.CREACT_DEBUG === 'true') {
    logger.debug(`Executing effects on output change for fiber: ${fiber.path?.join('.')}`);
    logger.debug(`Changed outputs: ${Array.from(changedOutputs).join(', ')}`);
  }

  for (let i = 0; i < fiber.effects.length; i++) {
    const effectHook = fiber.effects[i] as EffectHook;

    if (!effectHook || !effectHook.isReactive) {
      continue; // Skip non-reactive effects
    }

    // Check if this effect is bound to any of the changed outputs
    // REQ-5.2, 5.4: Only check specific bindings, no wildcard matching
    if (effectHook.boundOutputs) {
      const hasChangedDependency = Array.from(effectHook.boundOutputs).some(boundOutput => {
        // Direct match only - no wildcard patterns
        return changedOutputs.has(boundOutput);
      });

      if (hasChangedDependency) {
        // Run cleanup from previous effect if it exists
        if (effectHook.cleanup) {
          try {
            if (process.env.CREACT_DEBUG === 'true') {
              logger.debug(`Running cleanup for reactive effect ${i}`);
            }
            effectHook.cleanup();
            effectHook.cleanup = undefined;
          } catch (error) {
            logger.error('Reactive cleanup error:', error);
          }
        }

        // Run the reactive effect with async support and tracing
        try {
          if (process.env.CREACT_DEBUG === 'true') {
            logger.debug(`Running reactive effect ${effectHook.effectId || i}`);
          }
          
          const result = effectHook.callback();
          
          // Handle async reactive effects
          if (result instanceof Promise) {
            result.then(cleanup => {
              if (typeof cleanup === 'function') {
                effectHook.cleanup = cleanup;
              }
              if (process.env.CREACT_DEBUG === 'true') {
                logger.debug(`Async reactive effect ${effectHook.effectId || i} completed successfully`);
              }
            }).catch(error => {
              logger.error(`Async reactive effect ${effectHook.effectId || i} error:`, error);
            });
          } else {
            // Handle sync reactive effects
            if (typeof result === 'function') {
              effectHook.cleanup = result;
            }
            if (process.env.CREACT_DEBUG === 'true') {
              logger.debug(`Sync reactive effect ${effectHook.effectId || i} completed successfully`);
            }
          }

          // REQ-5.5: Update dependency values and hash
          if (effectHook.deps) {
            effectHook.lastDepsValues = [...effectHook.deps];
            effectHook.lastDepsHash = generateDependencyHash(effectHook.deps);
          }
        } catch (error) {
          logger.error(`Reactive effect ${effectHook.effectId || i} error:`, error);
        }
      }
    }
  }
}

/**
 * Cleanup all effects for a Fiber node before stack destroy
 * Called by CReact core before stack destruction
 *
 * @internal
 */
export function cleanupEffects(fiber: any): void {
  if (!fiber.effects || !Array.isArray(fiber.effects)) {
    return;
  }

  for (const effectHook of fiber.effects) {
    if (effectHook?.cleanup) {
      try {
        effectHook.cleanup();
      } catch (error) {
        logger.error('Cleanup error:', error);
      }
    }
  }
}