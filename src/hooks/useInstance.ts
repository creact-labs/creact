// REQ-01, REQ-03: useInstance hook for resource creation
// This hook registers infrastructure resources in the CloudDOM during rendering

import { CloudDOMNode, CloudDOMEventCallbacks } from '../core/types';
import { generateResourceId, toKebabCase } from '../utils/naming';
import { ProviderOutputTracker } from '../core/ProviderOutputTracker';
import {
  setRenderContext,
  clearRenderContext,
  setPreviousOutputs as setPreviousOutputsInternal,
  requireHookContext,
  incrementHookIndex,
} from './context';

// Global ProviderOutputTracker instance
let providerOutputTracker: ProviderOutputTracker | null = null;

/**
 * Get or create the global ProviderOutputTracker instance
 * @internal
 */
function getProviderOutputTracker(): ProviderOutputTracker {
  if (!providerOutputTracker) {
    providerOutputTracker = new ProviderOutputTracker();
  }
  return providerOutputTracker;
}

/**
 * Set the ProviderOutputTracker instance (for testing/injection)
 * @internal
 */
export function setProviderOutputTracker(tracker: ProviderOutputTracker): void {
  providerOutputTracker = tracker;
}

/**
 * Get the ProviderOutputTracker instance (for external access)
 * @internal
 */
export function getProviderOutputTrackerInstance(): ProviderOutputTracker {
  return getProviderOutputTracker();
}

/**
 * Create an enhanced CloudDOM node with output reference capabilities
 * This allows automatic binding when outputs are used in useState
 * The proxy dynamically reads from the node's current outputs for reactivity
 * 
 * REQ-2.1, 2.4, 2.5: Enhanced proxy that always reads live values and tracks access
 * 
 * @internal
 */
function createEnhancedNode(node: CloudDOMNode, fiber: any): CloudDOMNode {
  // Create a proxy that intercepts property access to provide reactive output access
  return new Proxy(node, {
    get(target, prop, receiver) {
      // Special handling for 'outputs' property to ensure reactivity
      if (prop === 'outputs') {
        // Return a proxy for the outputs object that tracks reads
        return new Proxy(target.outputs || {}, {
          get(outputsTarget, outputKey) {
            if (typeof outputKey === 'string') {
              // REQ-2.1: Always read from current target.outputs (live values)
              const currentValue = target.outputs?.[outputKey];

              // REQ-2.4, 2.5: Track this output read for binding creation
              if (currentValue !== undefined) {
                const tracker = getProviderOutputTracker();
                tracker.trackOutputRead(target.id, outputKey, fiber);

                if (process.env.CREACT_DEBUG === 'true') {
                  console.debug(`[useInstance] Tracked output read: ${target.id}.${outputKey} = ${currentValue}`);
                }
              }

              // REQ-2.2: Return undefined gracefully if not populated
              return currentValue;
            }
            return Reflect.get(outputsTarget, outputKey);
          },

          has(outputsTarget, outputKey) {
            // Check if output exists in current target.outputs
            return typeof outputKey === 'string' &&
              target.outputs !== undefined &&
              outputKey in target.outputs;
          },

          ownKeys(outputsTarget) {
            // Return keys from current target.outputs
            return target.outputs ? Object.keys(target.outputs) : [];
          }
        });
      }

      // For all other properties, return the original value
      return Reflect.get(target, prop, receiver);
    },

    has(target, prop) {
      // Standard property checks
      return Reflect.has(target, prop);
    },

    ownKeys(target) {
      // Return original keys
      return Reflect.ownKeys(target);
    }
  });
}

/**
 * Set the current rendering context
 * Called by Renderer before executing a component
 *
 * @internal
 */
export function setInstanceRenderContext(fiber: any, path: string[]): void {
  setRenderContext(fiber, path);
}

/**
 * Clear the current rendering context
 * Called by Renderer after component execution
 *
 * @internal
 */
export function clearInstanceRenderContext(): void {
  clearRenderContext();
}

/**
 * Set previous outputs map for restoration during render
 * Called by CReact before rendering
 *
 * @internal
 */
export function setPreviousOutputs(outputsMap: Map<string, Record<string, any>> | null): void {
  setPreviousOutputsInternal(outputsMap);
}

/**
 * Track construct call counts per component for auto-ID generation
 * Maps component fiber to construct type to call count
 */
const constructCallCounts = new WeakMap<any, Map<any, number>>();

/**
 * useInstance hook - Register an infrastructure resource (React-like API)
 *
 * This hook creates a CloudDOM node and attaches it to the current Fiber.
 * It must be called during component rendering (inside a component function).
 * 
 * Automatically extracts event callbacks (onDeploy, onError, onDestroy) from
 * component props and attaches them to the CloudDOM node for lifecycle events.
 *
 * REQ-01: JSX → CloudDOM rendering
 * REQ-04: Resource creation via hooks (React-like API)
 * REQ-2.3: CloudDOM event callbacks for deployment lifecycle
 *
 * @param construct - Constructor/class for the infrastructure resource
 * @param props - Properties/configuration for the resource (may include `key` and event callbacks)
 * @returns Reference to the created CloudDOM node
 *
 * @example
 * ```tsx
 * // With event callbacks (extracted from component props)
 * function MyDatabase({ onDeploy, onError }) {
 *   const db = useInstance(Database, {
 *     name: 'my-db',
 *     size: '100GB'
 *   });
 *   // onDeploy and onError are automatically extracted from component props
 *   return <></>;
 * }
 *
 * // Usage with event callbacks
 * <MyDatabase 
 *   onDeploy={(ctx) => console.log('Database deployed:', ctx.resourceId)}
 *   onError={(ctx, err) => console.error('Database failed:', err)}
 * />
 *
 * // Without event callbacks (normal usage)
 * function MyBucket() {
 *   const bucket = useInstance(S3Bucket, {
 *     bucketName: 'my-assets'
 *   });
 *   return <></>;
 * }
 * ```
 */
export function useInstance<T = any>(
  construct: new (...args: any[]) => T,
  props: Record<string, any>
): CloudDOMNode {
  // Use consolidated hook context
  const context = requireHookContext();
  const currentFiber = context.currentFiber!; // Non-null assertion safe due to requireHookContext validation
  const { currentPath, previousOutputsMap } = context;

  // Get hook index for this useInstance call (instance-specific)
  const hookIndex = incrementHookIndex('instance');

  // Extract key from props (React-like)
  const { key, ...restProps } = props;

  // Remove undefined values from props to match JSON serialization behavior
  // When CloudDOM is saved to backend, JSON.stringify strips undefined values
  // This ensures consistent comparison after deserialization
  const cleanProps: Record<string, any> = {};
  for (const [k, v] of Object.entries(restProps)) {
    if (v !== undefined) {
      cleanProps[k] = v;
    }
  }

  // Extract event callbacks from current component's props (not useInstance props)
  const componentProps = currentFiber.props || {};
  const eventCallbacks: CloudDOMEventCallbacks = {};

  // Extract onDeploy callback
  if (typeof componentProps.onDeploy === 'function') {
    eventCallbacks.onDeploy = componentProps.onDeploy;
  }

  // Extract onError callback
  if (typeof componentProps.onError === 'function') {
    eventCallbacks.onError = componentProps.onError;
  }

  // Extract onDestroy callback
  if (typeof componentProps.onDestroy === 'function') {
    eventCallbacks.onDestroy = componentProps.onDestroy;
  }

  // Generate ID from key or construct type
  let id: string;
  if (key !== undefined) {
    // Use explicit key if provided
    id = String(key);
  } else {
    // Auto-generate ID from construct type name (kebab-case)
    const constructName = toKebabCase(construct.name);

    // Track call count for this construct type in this component
    if (!constructCallCounts.has(currentFiber)) {
      constructCallCounts.set(currentFiber, new Map());
    }
    const counts = constructCallCounts.get(currentFiber)!;
    const count = counts.get(construct) || 0;
    counts.set(construct, count + 1);

    // Append index if multiple calls with same type
    if (count > 0) {
      id = `${constructName}-${count}`;
    } else {
      id = constructName;
    }
  }

  // Generate full resource ID from current path
  // Example: ['registry', 'service'] + 'bucket' → 'registry.service.bucket'
  const fullPath = [...currentPath, id];
  const resourceId = generateResourceId(fullPath);

  // Generate stable constructType identifier
  // This is a serializable string that uniquely identifies the construct type
  const constructType = construct.name || 'UnknownConstruct';

  // Create CloudDOM node
  const node: CloudDOMNode = {
    id: resourceId,
    path: fullPath,
    construct,
    constructType, // Serializable construct type identifier
    props: cleanProps, // Use cleaned props (no undefined values, no key)
    children: [],
    outputs: {}, // Will be populated during materialization
    eventCallbacks: Object.keys(eventCallbacks).length > 0 ? eventCallbacks : undefined,
  };

  // Restore outputs from previous state if available
  if (previousOutputsMap && previousOutputsMap.has(resourceId)) {
    node.outputs = { ...previousOutputsMap.get(resourceId)! };
    console.log(`[useInstance] ✓ Restored outputs for: ${resourceId}`, node.outputs);
  }

  // Attach node to current Fiber
  // The Fiber stores all CloudDOM nodes created during its execution
  if (!currentFiber.cloudDOMNodes) {
    currentFiber.cloudDOMNodes = [];
  }
  currentFiber.cloudDOMNodes.push(node);

  // Track this instance with ProviderOutputTracker for output change detection
  const outputTracker = getProviderOutputTracker();
  outputTracker.trackInstance(node, currentFiber);

  // REQ-2.3, 6.1: Enhance the node with proxy that reads live values and tracks access
  // No longer creating stale outputReferences - proxy reads directly from target.outputs
  const enhancedNode = createEnhancedNode(node, currentFiber);

  // Debug logging
  if (process.env.CREACT_DEBUG === 'true') {
    console.debug(`[useInstance] Created and tracked instance: ${resourceId}`);
    console.debug(`[useInstance] Node outputs at creation: ${JSON.stringify(node.outputs || {})}`);
  }

  // Return reference to the enhanced node
  // This allows components to reference the resource and its outputs
  // REQ-2.5: Multiple accesses within same render cycle are consistent
  return enhancedNode;
}

/**
 * Reset construct call counts for a fiber
 * Called by Renderer before executing a component
 *
 * @internal
 */
export function resetConstructCounts(fiber: any): void {
  constructCallCounts.delete(fiber);
}

/**
 * Get the current rendering path
 * Useful for debugging and testing
 *
 * @internal
 */
export function getCurrentPath(): string[] {
  try {
    const context = requireHookContext();
    return [...context.currentPath];
  } catch {
    return [];
  }
}

/**
 * Check if currently rendering
 * Useful for validation and testing
 *
 * @internal
 */
export function isRendering(): boolean {
  try {
    const context = requireHookContext();
    return context.currentFiber !== null;
  } catch {
    return false;
  }
}

/**
 * Update outputs for a CloudDOM node and notify bound components
 * This is called after deployment when provider outputs are available
 * @internal
 */
export function updateNodeOutputs(nodeId: string, newOutputs: Record<string, any>): void {
  const outputTracker = getProviderOutputTracker();
  const changes = outputTracker.updateNodeOutputs(nodeId, newOutputs);

  if (changes.length > 0) {
    // Process the changes and get affected fibers
    const affectedFibers = outputTracker.processOutputChanges(changes);

    if (process.env.CREACT_DEBUG === 'true') {
      console.debug(`[useInstance] Output changes detected for ${nodeId}:`, {
        changes: changes.length,
        affectedFibers: affectedFibers.size
      });
    }

    // Note: The actual re-rendering will be handled by the RenderScheduler
    // when it's integrated with the CReact main orchestrator
  }
}

/**
 * Get current outputs for a CloudDOM node
 * @internal
 */
export function getNodeOutputs(nodeId: string): Record<string, any> {
  const outputTracker = getProviderOutputTracker();
  return outputTracker.getNodeOutputs(nodeId);
}
