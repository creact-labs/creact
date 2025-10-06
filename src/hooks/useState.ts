// REQ-02: useState hook for declarative output binding
// This hook declares component outputs that persist across build/deploy cycles

/**
 * Current rendering context for useState
 * This is set by the Renderer during component execution
 */
let currentFiber: any = null;

/**
 * Current hook index for tracking multiple useState calls
 * Reset at the start of each component render
 */
let hookIndex: number = 0;

/**
 * Set the current rendering context for useState
 * Called by Renderer before executing a component
 *
 * @internal
 */
export function setStateRenderContext(fiber: any): void {
  currentFiber = fiber;
  hookIndex = 0; // Reset hook index for new component
}

/**
 * Clear the current rendering context for useState
 * Called by Renderer after component execution
 *
 * @internal
 */
export function clearStateRenderContext(): void {
  currentFiber = null;
  hookIndex = 0;
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
 *   const [distributionId, setDistributionId] = useState('');
 *   const [distributionDomain, setDistributionDomain] = useState('');
 *   const [distributionArn, setDistributionArn] = useState('');
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
  const currentHookIndex = hookIndex;
  hookIndex++;

  // Initialize this hook's state if first render
  if (currentFiber.hooks[currentHookIndex] === undefined) {
    currentFiber.hooks[currentHookIndex] = initialValue;
  }

  // Store the fiber and hook index for later access
  const fiber = currentFiber;
  const hookIdx = currentHookIndex;

  /**
   * setState function - Updates the output value (NOT a render trigger)
   *
   * This function updates the persisted output in the Fiber node's hooks array.
   * It does NOT trigger a re-render like React's setState.
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

    // Update this hook's state
    fiber.hooks[hookIdx] = newValue;
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
  return currentFiber !== null;
}

/**
 * Get the current state from Fiber (for testing)
 *
 * @internal
 */
export function getCurrentState(): Record<string, any> | undefined {
  return currentFiber?.state;
}
