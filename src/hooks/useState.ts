// REQ-02: useState hook for declarative output binding
// This hook declares component outputs that persist across build/deploy cycles

import {
  setStateRenderContext as setStateRenderContextInternal,
  clearStateRenderContext as clearStateRenderContextInternal,
  getStateContext,
  incrementHookIndex,
  hasStateContext as hasStateContextInternal,
  getCurrentState as getCurrentStateInternal,
} from './context';
import { StateBindingManager } from '../core/StateBindingManager';
import { generateBindingKey } from '../utils/naming';

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
export function setStateRenderContext(fiber: any): void {
  setStateRenderContextInternal(fiber);
}

/**
 * Clear the current rendering context for useState
 * Called by Renderer after component execution
 *
 * @internal
 */
export function clearStateRenderContext(): void {
  clearStateRenderContextInternal();
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
  // Get current context from AsyncLocalStorage
  const context = getStateContext();
  const { currentFiber } = context;
  
  // Validate hook is called during rendering
  if (!currentFiber) {
    throw new Error(
      'useState must be called during component rendering. ' +
        'Make sure you are calling it inside a component function, not at the top level.'
    );
  }

  // Initialize hooks array in Fiber node if not already present
  if (!currentFiber.hooks) {
    currentFiber.hooks = [];
  }

  // Get current hook index and increment for next call
  const currentHookIndex = incrementHookIndex();

  // Initialize this hook's state if first render
  if (currentFiber.hooks[currentHookIndex] === undefined) {
    currentFiber.hooks[currentHookIndex] = initialValue;
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
   *
   * During build: Collects values known at build-time
   * During deploy: Patches in async resources (queue URLs, ARNs)
   *
   * @param value - New value or updater function
   */
  const setState = (value: T | ((prev: T) => T)): void => {
    // Resolve value (handle both direct value and function forms)
    const newValue =
      typeof value === 'function' ? (value as (prev: T) => T)(fiber.hooks[hookIdx]) : value;

    const oldValue = fiber.hooks[hookIdx];

    // Only proceed if value actually changed
    if (oldValue === newValue) {
      return; // No change, skip update
    }

    // Debug logging
    if (process.env.CREACT_DEBUG === 'true') {
      const safeStringify = (value: any) => {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      };
      console.debug(`[useState] setState called: hookIdx=${hookIdx}, oldValue=${safeStringify(oldValue)}, newValue=${safeStringify(newValue)}, fiber.id=${fiber.path?.join('.')}`);
    }

    // Update this hook's state
    fiber.hooks[hookIdx] = newValue;

    // Check if the new value is a provider output and create automatic binding
    const bindingManager = getStateBindingManager();
    const outputInfo = bindingManager.isProviderOutput(newValue);
    
    if (outputInfo) {
      // Prevent infinite binding loops during reactivity
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

    // Schedule re-render for state changes (both bound and unbound)
    if (oldValue !== newValue) {
      // For now, trigger re-render for all state changes
      // In the future, this could be optimized to only trigger for output-bound state
      try {
        // Get CReact instance and schedule re-render
        const { getCReactInstance } = require('../core/CReact');
        const creact = getCReactInstance();
        if (creact) {
          creact.scheduleReRender(fiber, outputInfo ? 'output-update' : 'state-change');
        }
      } catch (error) {
        if (process.env.CREACT_DEBUG === 'true') {
          console.warn('[useState] Failed to schedule re-render:', error);
        }
      }
    }
  };

  // Get current state for this hook - read it fresh each time
  // This ensures synchronous setState calls during render are reflected
  const state = fiber.hooks[hookIdx] as T;

  return [state, setState];
}

/**
 * Check if useState context is available
 * Useful for validation and testing
 *
 * @internal
 */
export function hasStateContext(): boolean {
  return hasStateContextInternal();
}

/**
 * Get the current state from Fiber (for testing)
 *
 * @internal
 */
export function getCurrentState(): Record<string, any> | undefined {
  return getCurrentStateInternal();
}
