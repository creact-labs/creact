// REQ-03: useEffect hook for infrastructure lifecycle management
// This hook manages side effects that run between deployment cycles

import {
  getStateContext,
  incrementHookIndex,
} from './context';
import { FiberNode } from '../core/types';
import { generateBindingKey } from '../utils/naming';

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
 */
interface EffectHook {
  callback: EffectCallback;
  deps: DependencyList | undefined;
  cleanup?: () => void;
  hasRun: boolean;
  // Reactive system integration
  boundOutputs?: Set<string>; // Track which provider outputs this effect depends on (using binding keys)
  lastDepsHash?: string; // Hash of dependencies for change detection
  isReactive?: boolean; // Whether this effect should respond to output changes
  // Debugging and tracing
  effectId?: string; // Unique ID for debugging and orchestrator logs
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
 *     console.log('Database deployed');
 *     return () => console.log('Database destroyed');
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
  // Get current context from AsyncLocalStorage
  const context = getStateContext();
  const { currentFiber } = context;

  // Validate hook is called during rendering
  if (!currentFiber) {
    throw new Error(
      'useEffect must be called during component rendering. ' +
      'Make sure you are calling it inside a component function, not at the top level.'
    );
  }

  // Initialize effects array in Fiber node if not already present
  if (!currentFiber.effects) {
    (currentFiber as any).effects = [];
  }

  // Get current hook index and increment for next call
  const currentHookIndex = incrementHookIndex();

  // Analyze dependencies for provider output tracking
  const boundOutputs = new Set<string>();
  const isReactive = deps !== undefined && deps.length > 0;

  if (isReactive && deps) {
    // Detect provider outputs in dependencies using consistent naming
    for (const dep of deps) {
      if (dep && typeof dep === 'object') {
        // Check if dependency is a provider output reference
        if (dep.__providerOutput) {
          const bindingKey = generateBindingKey(dep.__providerOutput.nodeId, dep.__providerOutput.outputKey);
          boundOutputs.add(bindingKey);

          if (process.env.CREACT_DEBUG === 'true') {
            console.debug(`[useEffect] Detected provider output dependency: ${bindingKey}`);
          }
        }
        // Check if dependency is a CloudDOM output reference
        else if (dep.__cloudDOMOutput) {
          const bindingKey = generateBindingKey(dep.__cloudDOMOutput.nodeId, dep.__cloudDOMOutput.outputKey);
          boundOutputs.add(bindingKey);

          if (process.env.CREACT_DEBUG === 'true') {
            console.debug(`[useEffect] Detected CloudDOM output dependency: ${bindingKey}`);
          }
        }
      }
    }
  }

  // Generate dependency hash for change detection
  const depsHash = deps ? generateDependencyHash(deps) : undefined;

  // Generate unique effect ID for debugging and orchestrator logs
  const effectId = `${currentFiber.path.join('.')}:${currentHookIndex}`;

  // Store effect data in Fiber node
  const effectHook: EffectHook = {
    callback: effect,
    deps,
    hasRun: false,
    boundOutputs: boundOutputs.size > 0 ? boundOutputs : undefined,
    lastDepsHash: depsHash,
    isReactive,
    effectId
  };

  (currentFiber as any).effects[currentHookIndex] = effectHook;

  // Register effect with reactive system if it has bound outputs
  if (boundOutputs.size > 0) {
    registerEffectWithReactiveSystem(currentFiber, currentHookIndex, boundOutputs);
  }
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
    console.debug(`[useEffect] Registered effect ${effectIndex} with reactive system for outputs: ${bindingKeys.join(', ')}`);
  }
}

/**
 * Check if effect dependencies have changed, including provider outputs
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
          console.debug(`[useEffect] Effect dependency changed: ${boundOutputKey}`);
        }
        return true;
      }
    }
  }

  // Compare dependency hash
  if (current.lastDepsHash !== previous.lastDepsHash) {
    return true;
  }

  // Fallback to direct comparison
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
    console.debug(`[useEffect] executeEffects called for fiber: ${fiber.path?.join('.')}`);
    console.debug(`[useEffect] Fiber has effects: ${!!(fiber.effects)}, length: ${fiber.effects?.length || 0}`);
    if (changedOutputs && changedOutputs.size > 0) {
      console.debug(`[useEffect] Changed outputs: ${Array.from(changedOutputs).join(', ')}`);
    }
  }

  if (!fiber.effects || !Array.isArray(fiber.effects)) {
    if (process.env.CREACT_DEBUG === 'true') {
      console.debug(`[useEffect] No effects found for fiber: ${fiber.path?.join('.')}`);
    }
    return;
  }

  if (process.env.CREACT_DEBUG === 'true') {
    console.debug(`[useEffect] Executing ${fiber.effects.length} effects for fiber: ${fiber.path?.join('.')}`);
  }

  for (let i = 0; i < fiber.effects.length; i++) {
    const effectHook = fiber.effects[i] as EffectHook;

    if (!effectHook) {
      if (process.env.CREACT_DEBUG === 'true') {
        console.debug(`[useEffect] Effect ${i} is null/undefined`);
      }
      continue;
    }

    // Check if effect should run based on dependencies and output changes
    const shouldRun = hasEffectDependenciesChanged(effectHook, fiber.previousEffects?.[i], changedOutputs);

    if (process.env.CREACT_DEBUG === 'true') {
      console.debug(`[useEffect] Effect ${i} should run: ${shouldRun}`);
      if (effectHook.boundOutputs && effectHook.boundOutputs.size > 0) {
        console.debug(`[useEffect] Effect ${i} bound to outputs: ${Array.from(effectHook.boundOutputs).join(', ')}`);
      }
    }

    if (shouldRun) {
      // Run cleanup from previous effect if it exists
      if (effectHook.cleanup) {
        try {
          if (process.env.CREACT_DEBUG === 'true') {
            console.debug(`[useEffect] Running cleanup for effect ${i}`);
          }
          effectHook.cleanup();
          effectHook.cleanup = undefined; // Clear cleanup after running
        } catch (error) {
          console.error('[useEffect] Cleanup error:', error);
        }
      }

      // Run the effect with async support and tracing
      try {
        if (process.env.CREACT_DEBUG === 'true') {
          console.debug(`[useEffect] Running effect ${effectHook.effectId || i}`);
        }
        
        const result = effectHook.callback();
        
        // Handle async effects
        if (result instanceof Promise) {
          result.then(cleanup => {
            if (typeof cleanup === 'function') {
              effectHook.cleanup = cleanup;
            }
            if (process.env.CREACT_DEBUG === 'true') {
              console.debug(`[useEffect] Async effect ${effectHook.effectId || i} completed successfully`);
            }
          }).catch(error => {
            console.error(`[useEffect] Async effect ${effectHook.effectId || i} error:`, error);
          });
        } else {
          // Handle sync effects
          if (typeof result === 'function') {
            effectHook.cleanup = result;
          }
          if (process.env.CREACT_DEBUG === 'true') {
            console.debug(`[useEffect] Sync effect ${effectHook.effectId || i} completed successfully`);
          }
        }
        
        effectHook.hasRun = true;

        // Update dependency hash for next comparison
        if (effectHook.deps) {
          effectHook.lastDepsHash = generateDependencyHash(effectHook.deps);
        }
      } catch (error) {
        console.error(`[useEffect] Effect ${effectHook.effectId || i} error:`, error);
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
    console.debug(`[useEffect] Executing effects on output change for fiber: ${fiber.path?.join('.')}`);
    console.debug(`[useEffect] Changed outputs: ${Array.from(changedOutputs).join(', ')}`);
  }

  for (let i = 0; i < fiber.effects.length; i++) {
    const effectHook = fiber.effects[i] as EffectHook;

    if (!effectHook || !effectHook.isReactive) {
      continue; // Skip non-reactive effects
    }

    // Check if this effect is bound to any of the changed outputs
    if (effectHook.boundOutputs) {
      const hasChangedDependency = Array.from(effectHook.boundOutputs).some(boundOutput =>
        changedOutputs.has(boundOutput)
      );

      if (hasChangedDependency) {
        // Run cleanup from previous effect if it exists
        if (effectHook.cleanup) {
          try {
            if (process.env.CREACT_DEBUG === 'true') {
              console.debug(`[useEffect] Running cleanup for reactive effect ${i}`);
            }
            effectHook.cleanup();
            effectHook.cleanup = undefined;
          } catch (error) {
            console.error('[useEffect] Reactive cleanup error:', error);
          }
        }

        // Run the reactive effect with async support and tracing
        try {
          if (process.env.CREACT_DEBUG === 'true') {
            console.debug(`[useEffect] Running reactive effect ${effectHook.effectId || i}`);
          }
          
          const result = effectHook.callback();
          
          // Handle async reactive effects
          if (result instanceof Promise) {
            result.then(cleanup => {
              if (typeof cleanup === 'function') {
                effectHook.cleanup = cleanup;
              }
              if (process.env.CREACT_DEBUG === 'true') {
                console.debug(`[useEffect] Async reactive effect ${effectHook.effectId || i} completed successfully`);
              }
            }).catch(error => {
              console.error(`[useEffect] Async reactive effect ${effectHook.effectId || i} error:`, error);
            });
          } else {
            // Handle sync reactive effects
            if (typeof result === 'function') {
              effectHook.cleanup = result;
            }
            if (process.env.CREACT_DEBUG === 'true') {
              console.debug(`[useEffect] Sync reactive effect ${effectHook.effectId || i} completed successfully`);
            }
          }

          // Update dependency hash
          if (effectHook.deps) {
            effectHook.lastDepsHash = generateDependencyHash(effectHook.deps);
          }
        } catch (error) {
          console.error(`[useEffect] Reactive effect ${effectHook.effectId || i} error:`, error);
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
        console.error('[useEffect] Cleanup error:', error);
      }
    }
  }
}