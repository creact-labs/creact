// REQ-03: useEffect hook for infrastructure lifecycle management
// This hook manages side effects that run between deployment cycles

import {
  getStateContext,
  incrementHookIndex,
} from './context';

/**
 * Effect function type - runs after deployment
 */
export type EffectCallback = () => void | (() => void);

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
}

/**
 * useEffect hook - Infrastructure lifecycle management (NOT reactive like React)
 *
 * This hook manages side effects that run between deployment cycles.
 * Unlike React's useEffect, this does NOT run after every render.
 *
 * Infrastructure Lifecycle:
 * 1. **Build Phase**: Component renders, useEffect is registered
 * 2. **Deploy Phase**: Resources are materialized by cloud provider
 * 3. **Post-Deploy Phase**: useEffect callbacks run with real resource outputs
 * 4. **State Update**: Effects can call setState to update persistent outputs
 *
 * Key differences from React:
 * - React: Runs after every render (DOM updates)
 * - CReact: Runs after deployment (infrastructure updates)
 * - React: Cleanup runs before next effect or unmount
 * - CReact: Cleanup runs before next deployment or stack destroy
 *
 * @param effect - Effect callback that runs after deployment
 * @param deps - Dependency array (same semantics as React)
 *
 * @example
 * ```tsx
 * function DatabaseStack() {
 *   const [dbUrl, setDbUrl] = useState('');
 *   const db = useInstance(PostgresDatabase, { name: 'my-db' });
 *
 *   // Runs after deployment when db.outputs are available
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

  // Store effect data in Fiber node
  const effectHook: EffectHook = {
    callback: effect,
    deps,
    hasRun: false,
  };

  (currentFiber as any).effects[currentHookIndex] = effectHook;
}

/**
 * Execute effects for a Fiber node after deployment
 * Called by CReact core after successful deployment
 *
 * @internal
 */
export function executeEffects(fiber: any): void {
  console.log(`[useEffect] executeEffects called for fiber: ${fiber.path?.join('.')}`);
  console.log(`[useEffect] Fiber has effects: ${!!(fiber.effects)}, length: ${fiber.effects?.length || 0}`);
  
  if (!fiber.effects || !Array.isArray(fiber.effects)) {
    console.log(`[useEffect] No effects found for fiber: ${fiber.path?.join('.')}`);
    return;
  }

  console.log(`[useEffect] Executing ${fiber.effects.length} effects for fiber: ${fiber.path?.join('.')}`);

  for (let i = 0; i < fiber.effects.length; i++) {
    const effectHook = fiber.effects[i] as EffectHook;
    
    if (!effectHook) {
      console.log(`[useEffect] Effect ${i} is null/undefined`);
      continue;
    }

    // Check if effect should run based on dependencies
    const shouldRun = shouldEffectRun(effectHook, fiber.previousEffects?.[i]);
    console.log(`[useEffect] Effect ${i} should run: ${shouldRun}`);

    if (shouldRun) {
      // Run cleanup from previous effect if it exists
      if (effectHook.cleanup) {
        try {
          console.log(`[useEffect] Running cleanup for effect ${i}`);
          effectHook.cleanup();
        } catch (error) {
          console.error('[useEffect] Cleanup error:', error);
        }
      }

      // Run the effect
      try {
        console.log(`[useEffect] Running effect ${i}`);
        const cleanup = effectHook.callback();
        if (typeof cleanup === 'function') {
          effectHook.cleanup = cleanup;
        }
        effectHook.hasRun = true;
        console.log(`[useEffect] Effect ${i} completed successfully`);
      } catch (error) {
        console.error('[useEffect] Effect error:', error);
      }
    }
  }

  // Store current effects as previous for next deployment
  fiber.previousEffects = [...fiber.effects];
}

/**
 * Check if effect should run based on dependency comparison
 */
function shouldEffectRun(current: EffectHook, previous?: EffectHook): boolean {
  // Always run on first deployment
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

  // Compare dependencies
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