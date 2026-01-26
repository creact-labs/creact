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
 * Render a JSX element to a Fiber
 */
export declare function renderFiber(element: any, path: string[]): Fiber;
/**
 * Collect all instance nodes from fiber tree
 */
export declare function collectInstanceNodes(fiber: Fiber): any[];
/**
 * Clean up a fiber tree
 */
export declare function cleanupFiber(fiber: Fiber): void;
