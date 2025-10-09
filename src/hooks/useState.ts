// REQ-02: useState hook for declarative output binding
// This hook declares component outputs that persist across build/deploy cycles

import {
  requireHookContext,
  incrementHookIndex,
  setRenderContext,
  clearRenderContext,
  hasRenderContext,
  getCurrentState as getCurrentStateFromContext,
} from './context';
import { StateBindingManager } from '../core/StateBindingManager';
import { generateBindingKey } from '../utils/naming';
import { FiberNode } from '../core/types';
import { getReactiveUpdateQueue } from '../core/ReactiveUpdateQueue';

// Global StateBindingManager instance
let stateBindingManager: StateBindingManager | null = null;

/**
 * Get or create the global StateBindingManager instance
 * @internal
 */
function getStateBindingManager(): StateBindingManager {
  if (!stateBindingManager) {
    stateBindingManager = new StateBindingManager();
  }
  return stateBindingManager;
}

/**
 * Set the StateBindingManager instance (for testing/injection)
 * @internal
 */
export function setStateBindingManager(manager: StateBindingManager): void {
  stateBindingManager = manager;
}

/**
 * Get the StateBindingManager instance (for external access)
 * @internal
 */
export function getStateBindingManagerInstance(): StateBindingManager {
  return getStateBindingManager();
}

/**
 * Set the current rendering context for useState
 * Called by Renderer before executing a component
 *
 * @internal
 */
export function setStateRenderContext(fiber: FiberNode, path?: string[]): void {
  setRenderContext(fiber, path);
}

/**
 * Clear the current rendering context for useState
 * Called by Renderer after component execution
 *
 * @internal
 */
export function clearStateRenderContext(): void {
  clearRenderContext();
}

/**
 * useState hook - Declare component outputs (NOT reactive state)
 *
 * This hook declares outputs that will be persisted across build/deploy cycles.
 * Unlike React's useState, this does NOT trigger re-renders.
 *
 * Mimics React's useState API with hooks array pattern for multiple calls.
 *
 * REQ-02: Stack Context (declarative outputs)
 *
 * Semantics:
 * - `useState(initialValue)` - Declares a single output value
 * - `setState(value)` during build - Updates the output value for build-time enrichment
 * - `setState(value)` during deploy - Updates persisted output after provider materialization
 * - NOT a render trigger - it's a persistent output update mechanism
 * - Supports multiple useState calls per component (like React)
 *
 * Key difference from React:
 * - React: `setState()` causes re-render in memory
 * - CReact: `setState()` updates persisted outputs for next cycle
 *
 * @param initialValue - Initial output value to declare
 * @returns Tuple of [state, setState] where setState updates the output value
 *
 * @example
 * ```tsx
 * function CDNStack({ children }) {
 *   const distribution = useInstance('cdn', CloudFrontDistribution, { ... });
 *
 *   // Multiple useState calls (like React)
 *   const [distributionId, setDistributionId] = useState<string>();
 *   const [distributionDomain, setDistributionDomain] = useState<string>();
 *   const [distributionArn, setDistributionArn] = useState<string>();
 *
 *   // Optional: Enrich outputs after async materialization
 *   useEffect(async () => {
 *     const actualDomain = await distribution.getDomain();
 *     setDistributionDomain(actualDomain);
 *   }, [distribution]);
 *
 *   // Aggregate outputs for StackContext
 *   const outputs = {
 *     distributionId,
 *     distributionDomain,
 *     distributionArn,
 *   };
 *
 *   return <StackContext.Provider value={outputs}>{children}</StackContext.Provider>;
 * }
 * ```
 */
export function useState<T = undefined>(
  initialValue?: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Use consolidated hook context
  const context = requireHookContext();
  const currentFiber = context.currentFiber!; // Non-null assertion safe due to requireHookContext validation

  // Initialize hooks array in Fiber node if not already present
  if (!currentFiber.hooks) {
    currentFiber.hooks = [];
  }

  // Get current hook index and increment for next call (state-specific)
  const currentHookIndex = incrementHookIndex('state');

  // Initialize this hook's state if first render
  if (currentFiber.hooks[currentHookIndex] === undefined) {
    // CRITICAL: Check for hydrated value first (hot reload state restoration)
    // This allows useState to restore persisted state instead of using initial value
    let hydratedValue: any = undefined;

    // Try to get CReact instance to check for hydration data
    try {
      const { getCReactInstance } = require('../core/CReact');
      const creactInstance = getCReactInstance?.();

      if (creactInstance && creactInstance.hasHydrationData()) {
        // CRITICAL: The fiber path is the component path (e.g., 'web-app-stack')
        const fiberPath = currentFiber.path?.join('.') || '';
        console.log(`[useState] 🔍 Looking for hydration: component="${fiberPath}", hookIndex=${currentHookIndex}`);
        
        // Try to get hydration from component path
        hydratedValue = creactInstance.getHydratedValueForComponent(fiberPath, currentHookIndex);

        if (hydratedValue !== undefined) {
          console.log(`[useState] ✅ HYDRATION SUCCESS for ${fiberPath}[${currentHookIndex}]:`, hydratedValue);
        } else {
          console.log(`[useState] ❌ HYDRATION FAILED for ${fiberPath}[${currentHookIndex}]`);
          console.log(`[useState]    Available hydration keys:`, creactInstance.getHydrationMapKeys?.() || 'N/A');
        }
      } else {
        console.log(`[useState] ⚠️  No hydration data available (instance=${!!creactInstance}, hasData=${creactInstance?.hasHydrationData()})`);
      }
    } catch (error) {
      // Hydration is optional, continue with initial value if it fails
      console.warn('[useState] ⚠️  Hydration check failed:', error);
      if (process.env.CREACT_DEBUG === 'true') {
        console.debug('[useState] Stack:', (error as Error).stack);
      }
    }

    // Use hydrated value if available, otherwise use initial value
    const finalValue = hydratedValue !== undefined ? hydratedValue : initialValue;
    currentFiber.hooks[currentHookIndex] = finalValue;
    
    console.log(`[useState] 📝 Initialized hook[${currentHookIndex}] = ${JSON.stringify(finalValue)} (hydrated=${hydratedValue !== undefined})`);
  }

  // Store the fiber and hook index for later access
  const fiber = currentFiber;
  const hookIdx = currentHookIndex;

  /**
   * setState function - Updates the output value with reactive capabilities
   *
   * This function updates the persisted output in the Fiber node's hooks array.
   * It now includes:
   * - Change detection to avoid unnecessary updates
   * - Automatic binding detection for provider outputs
   * - Integration with StateBindingManager for reactive updates
   * - REQ-4.1, 4.2, 4.3: Internal update mechanism to prevent circular dependencies
   *
   * During build: Collects values known at build-time
   * During deploy: Patches in async resources (queue URLs, ARNs)
   *
   * @param value - New value or updater function
   * @param isInternalUpdate - If true, skip binding creation (prevents loops)
   */
  const setState = (value: T | ((prev: T) => T), isInternalUpdate = false): void => {
    // Resolve value (handle both direct value and function forms)
    const newValue =
      typeof value === 'function' ? (value as (prev: T) => T)(fiber.hooks?.[hookIdx]) : value;

    const oldValue = fiber.hooks?.[hookIdx];

    // Debug logging (before change check for better visibility)
    if (process.env.CREACT_DEBUG === 'true') {
      const safeStringify = (value: any) => {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      };
      console.debug(`[useState] setState called: hookIdx=${hookIdx}, oldValue=${safeStringify(oldValue)}, newValue=${safeStringify(newValue)}, isInternal=${isInternalUpdate}, fiber.id=${fiber.path?.join('.')}`);
    }

    // Only proceed if value actually changed
    if (oldValue === newValue) {
      if (process.env.CREACT_DEBUG === 'true') {
        console.debug(`[useState] No change detected, skipping update`);
      }
      return; // No change, skip update
    }

    // Update this hook's state
    if (fiber.hooks) {
      fiber.hooks[hookIdx] = newValue;
    }

    // REQ-4.2: Only create bindings for user updates, not internal ones
    // This prevents infinite binding loops when StateBindingManager updates state
    if (!isInternalUpdate) {
      // Check if the new value is a provider output and create automatic binding
      const bindingManager = getStateBindingManager();
      const outputInfo = bindingManager.isProviderOutput(newValue);

      if (outputInfo) {
        // REQ-4.1, 4.3: Prevent infinite binding loops during reactivity
        // Only bind if this state is not already bound to this output
        if (!bindingManager.isStateBoundToOutput(fiber, hookIdx)) {
          // Automatically bind this state to the provider output
          bindingManager.bindStateToOutput(
            fiber,
            hookIdx,
            outputInfo.nodeId,
            outputInfo.outputKey,
            newValue
          );

          if (process.env.CREACT_DEBUG === 'true') {
            const bindingKey = generateBindingKey(outputInfo.nodeId, outputInfo.outputKey);
            console.debug(`[useState] Auto-bound state to output: ${bindingKey}`);
          } 
        } else {
          if (process.env.CREACT_DEBUG === 'true') {
            const bindingKey = generateBindingKey(outputInfo.nodeId, outputInfo.outputKey);
            console.debug(`[useState] Skipped re-binding already bound state: ${bindingKey}`);
          }
        }
      }
    } else {
      if (process.env.CREACT_DEBUG === 'true') {
        console.debug(`[useState] Skipped binding check for internal update`);
      }
    }

    // REQ-4.4: Mark fiber as dirty and enqueue for re-render
    // This is critical for initial deployment where outputs go from undefined → value
    // The fiber will be collected by the reactivity phase and re-rendered
    if (!isInternalUpdate && oldValue !== newValue) {
      // Mark this fiber as having state changes
      if (!(fiber as any).__stateChanged) {
        (fiber as any).__stateChanged = true;
      }

      // Enqueue fiber for re-rendering in reactivity phase
      const queue = getReactiveUpdateQueue();
      queue.enqueue(fiber);

      if (process.env.CREACT_DEBUG === 'true') {
        console.debug(`[useState] Enqueued fiber ${fiber.path?.join('.')} for re-render (queue size: ${queue.size()})`);
      }
    }
  };

  // REQ-4.1, 4.2: Store setState callback in fiber for internal updates
  // This allows StateBindingManager to update state without creating new bindings
  if (!(fiber as any).setStateCallbacks) {
    (fiber as any).setStateCallbacks = [];
  }
  (fiber as any).setStateCallbacks[hookIdx] = setState;

  // Get current state for this hook - read it fresh each time
  // This ensures synchronous setState calls during render are reflected
  const state = (fiber.hooks && fiber.hooks[hookIdx]) as T;

  return [state, setState];
}

/**
 * Check if useState context is available
 * Useful for validation and testing
 *
 * @internal
 */
export function hasStateContext(): boolean {
  return hasRenderContext();
}

/**
 * Get the current state from Fiber (for testing)
 *
 * @internal
 */
export function getCurrentState(): Record<string, any> | undefined {
  return getCurrentStateFromContext();
}
