/**
 * Render - transform JSX to Fiber tree
 */
import type { Fiber } from './fiber.js';
/**
 * Get current fiber (for hooks)
 */
export declare function getCurrentFiber(): Fiber | null;
/**
 * Get current path (for hooks)
 */
export declare function getCurrentPath(): string[];
/**
 * Get current resource path (for useInstance)
 * Only components with useInstance contribute to this path
 */
export declare function getCurrentResourcePath(): string[];
/**
 * Push a segment to resource path (called by useInstance)
 */
export declare function pushResourcePath(segment: string): void;
/**
 * Pop a segment from resource path (called after component with instance renders)
 */
export declare function popResourcePath(): void;
/**
 * Reset resource path (called at start of render)
 */
export declare function resetResourcePath(): void;
/**
 * Render a JSX element to a Fiber
 */
export declare function renderFiber(element: any, path: string[]): Fiber;
/**
 * Collect all instance nodes from fiber tree
 * Returns cloned nodes to ensure returned arrays are independent snapshots
 */
export declare function collectInstanceNodes(fiber: Fiber): any[];
/**
 * Clean up a fiber tree
 */
export declare function cleanupFiber(fiber: Fiber): void;
