// REQ-01, REQ-03: useInstance hook for resource creation
// This hook registers infrastructure resources in the CloudDOM during rendering

import { CloudDOMNode, CloudDOMEventCallbacks } from '../core/types';
import { generateResourceId, toKebabCase } from '../utils/naming';
import { ProviderOutputTracker } from '../core/ProviderOutputTracker';
import {
  setInstanceRenderContext,
  clearInstanceRenderContext,
  getInstanceContext,
  setPreviousOutputs as setPreviousOutputsInternal,
  getCurrentPath as getCurrentPathInternal,
  isRendering as isRenderingInternal,
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
 * @internal
 */
function createEnhancedNode(node: CloudDOMNode, outputReferences: Record<string, any>): CloudDOMNode {
  // Create a proxy that intercepts property access to provide output references
  return new Proxy(node, {
    get(target, prop, receiver) {
      // If accessing an output property, return the output reference for automatic binding
      if (typeof prop === 'string' && outputReferences[prop]) {
        return outputReferences[prop];
      }
      
      // For all other properties, return the original value
      return Reflect.get(target, prop, receiver);
    },
    
    has(target, prop) {
      // Include output references in property checks
      if (typeof prop === 'string' && outputReferences[prop]) {
        return true;
      }
      return Reflect.has(target, prop);
    },
    
    ownKeys(target) {
      // Include output reference keys
      const originalKeys = Reflect.ownKeys(target);
      const outputKeys = Object.keys(outputReferences);
      return [...originalKeys, ...outputKeys.filter(key => !originalKeys.includes(key))];
    }
  });
}

/**
 * Set the current rendering context
 * Called by Renderer before executing a component
 *
 * @internal
 */
export function setRenderContext(fiber: any, path: string[]): void {
  setInstanceRenderContext(fiber, path);
}

/**
 * Clear the current rendering context
 * Called by Renderer after component execution
 *
 * @internal
 */
export function clearRenderContext(): void {
  clearInstanceRenderContext();
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
  // Get current context from AsyncLocalStorage
  const { currentFiber, currentPath, previousOutputsMap } = getInstanceContext();
  
  // Validate hook is called during rendering
  if (!currentFiber) {
    throw new Error(
      'useInstance must be called during component rendering. ' +
        'Make sure you are calling it inside a component function, not at the top level.'
    );
  }

  // Extract key from props (React-like)
  const { key, ...restProps } = props;

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

  // Create CloudDOM node
  const node: CloudDOMNode = {
    id: resourceId,
    path: fullPath,
    construct,
    props: { ...restProps }, // Clone props (without key) to avoid mutations
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

  // Create output references for automatic state binding
  const outputReferences = outputTracker.extractOutputReferences(node);
  
  // Enhance the node with output reference methods
  const enhancedNode = createEnhancedNode(node, outputReferences);

  // Debug logging
  if (process.env.CREACT_DEBUG === 'true') {
    console.debug(`[useInstance] Created and tracked instance: ${resourceId}, outputs: ${Object.keys(outputReferences).length}`);
  }

  // Return reference to the enhanced node
  // This allows components to reference the resource and its outputs
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
  return getCurrentPathInternal();
}

/**
 * Check if currently rendering
 * Useful for validation and testing
 *
 * @internal
 */
export function isRendering(): boolean {
  return isRenderingInternal();
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
