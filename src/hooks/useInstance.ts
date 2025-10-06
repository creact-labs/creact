// REQ-01, REQ-03: useInstance hook for resource creation
// This hook registers infrastructure resources in the CloudDOM during rendering

import { CloudDOMNode } from '../core/types';
import { generateResourceId, toKebabCase } from '../utils/naming';
import {
  setInstanceRenderContext,
  clearInstanceRenderContext,
  getInstanceContext,
  setPreviousOutputs as setPreviousOutputsInternal,
  getCurrentPath as getCurrentPathInternal,
  isRendering as isRenderingInternal,
} from './context';

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
 * REQ-01: JSX → CloudDOM rendering
 * REQ-04: Resource creation via hooks (React-like API)
 *
 * @param construct - Constructor/class for the infrastructure resource
 * @param props - Properties/configuration for the resource (may include `key`)
 * @returns Reference to the created CloudDOM node
 *
 * @example
 * ```tsx
 * // With explicit key (like React)
 * function MyBucket() {
 *   const bucket = useInstance(S3Bucket, {
 *     key: 'assets',
 *     bucketName: 'my-assets',
 *     publicReadAccess: true
 *   });
 *   return null;
 * }
 *
 * // Without key (auto-generated from construct type)
 * function MyBucket() {
 *   const bucket = useInstance(S3Bucket, {
 *     bucketName: 'my-assets'
 *   });
 *   // ID will be auto-generated as 's3bucket'
 *   return null;
 * }
 *
 * // Multiple calls with same type (auto-indexed)
 * function MultiDatabase() {
 *   const db1 = useInstance(RDSInstance, { name: 'db-1' }); // 'rdsinstance-0'
 *   const db2 = useInstance(RDSInstance, { name: 'db-2' }); // 'rdsinstance-1'
 *   return null;
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

  // Return reference to the node
  // This allows components to reference the resource (e.g., for outputs)
  return node;
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
