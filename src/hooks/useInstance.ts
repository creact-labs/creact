// REQ-01, REQ-03: useInstance hook for resource creation
// This hook registers infrastructure resources in the CloudDOM during rendering

import { CloudDOMNode } from '../core/types';

/**
 * Current rendering context
 * This is set by the Renderer during component execution
 */
let currentFiber: any = null;
let currentPath: string[] = [];

/**
 * Set the current rendering context
 * Called by Renderer before executing a component
 * 
 * @internal
 */
export function setRenderContext(fiber: any, path: string[]): void {
  currentFiber = fiber;
  currentPath = path;
}

/**
 * Clear the current rendering context
 * Called by Renderer after component execution
 * 
 * @internal
 */
export function clearRenderContext(): void {
  currentFiber = null;
  currentPath = [];
}

/**
 * useInstance hook - Register an infrastructure resource
 * 
 * This hook creates a CloudDOM node and attaches it to the current Fiber.
 * It must be called during component rendering (inside a component function).
 * 
 * REQ-01: JSX → CloudDOM rendering
 * REQ-03: Resource creation via hooks
 * 
 * @param id - Unique identifier for this resource (within parent scope)
 * @param construct - Constructor/class for the infrastructure resource
 * @param props - Properties/configuration for the resource
 * @returns Reference to the created CloudDOM node
 * 
 * @example
 * ```tsx
 * function MyBucket() {
 *   const bucket = useInstance('assets', S3Bucket, {
 *     bucketName: 'my-assets',
 *     publicReadAccess: true
 *   });
 *   return null;
 * }
 * ```
 */
export function useInstance<T = any>(
  id: string,
  construct: new (...args: any[]) => T,
  props: Record<string, any>
): CloudDOMNode {
  // Validate hook is called during rendering
  if (!currentFiber) {
    throw new Error(
      'useInstance must be called during component rendering. ' +
      'Make sure you are calling it inside a component function, not at the top level.'
    );
  }
  
  // Generate full resource ID from current path
  // Example: ['registry', 'service'] + 'bucket' → 'registry.service.bucket'
  const fullPath = [...currentPath, id];
  const resourceId = fullPath.join('.');
  
  // Create CloudDOM node
  const node: CloudDOMNode = {
    id: resourceId,
    path: fullPath,
    construct,
    props: { ...props }, // Clone props to avoid mutations
    children: [],
    outputs: {}, // Will be populated during materialization
  };
  
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
 * Get the current rendering path
 * Useful for debugging and testing
 * 
 * @internal
 */
export function getCurrentPath(): string[] {
  return [...currentPath];
}

/**
 * Check if currently rendering
 * Useful for validation and testing
 * 
 * @internal
 */
export function isRendering(): boolean {
  return currentFiber !== null;
}
