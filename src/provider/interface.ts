/**
 * Provider interface - abstracts the execution environment
 */

import type { InstanceNode } from '../primitives/instance.js';

/**
 * Provider interface - implement this to connect to any backend
 */
export interface Provider {
  /**
   * Apply/materialize an instance node
   * Returns outputs that will be injected as reactive signals
   */
  apply(node: InstanceNode): Promise<Record<string, any>>;

  /**
   * Destroy/cleanup an instance node
   */
  destroy(node: InstanceNode): Promise<void>;
}

/**
 * Create a mock provider for testing
 */
export function createMockProvider(
  handlers: Partial<{
    apply: (node: InstanceNode) => Promise<Record<string, any>> | Record<string, any>;
    destroy: (node: InstanceNode) => Promise<void> | void;
  }> = {}
): Provider {
  return {
    async apply(node) {
      if (handlers.apply) {
        return await handlers.apply(node);
      }
      // Default: return empty outputs
      return {};
    },
    async destroy(node) {
      if (handlers.destroy) {
        await handlers.destroy(node);
      }
    },
  };
}
