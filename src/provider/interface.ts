/**
 * Provider interface - abstracts the execution environment
 */

import type { InstanceNode } from '../primitives/instance.js';

/**
 * Event emitted when provider detects output changes
 */
export interface OutputChangeEvent {
  resourceName: string;  // Cloud resource identity (e.g., "creact-environments")
  outputs: Record<string, any>;
  timestamp: number;
}

/**
 * Provider interface - implement this to connect to any backend
 */
export interface Provider {
  /** Initialize provider (async setup) */
  initialize?(): Promise<void>;

  /**
   * Materialize nodes into cloud resources.
   *
   * Providers should call node.setOutputs() when outputs are available.
   * This triggers reactive updates - dependent components re-render automatically.
   *
   * For sync providers: call node.setOutputs() immediately
   * For async providers: call node.setOutputs() in the async callback
   *
   * Returns a Promise that resolves when all resources are materialized.
   */
  materialize(nodes: InstanceNode[]): Promise<void>;

  /** Destroy a node */
  destroy(node: InstanceNode): Promise<void>;

  /** Lifecycle hooks */
  preDeploy?(nodes: InstanceNode[]): Promise<void>;
  postDeploy?(nodes: InstanceNode[], outputs: Record<string, any>): Promise<void>;
  onError?(error: Error, nodes: InstanceNode[]): Promise<void>;

  /** Event system (required for continuous runtime) */
  on(event: 'outputsChanged', handler: (change: OutputChangeEvent) => void): void;
  off(event: 'outputsChanged', handler: (change: OutputChangeEvent) => void): void;
  stop(): void;
}

/**
 * Create a mock provider for testing
 */
export function createMockProvider(
  handlers: Partial<{
    materialize: (nodes: InstanceNode[]) => Promise<void> | void;
    destroy: (node: InstanceNode) => Promise<void> | void;
  }> = {}
): Provider {
  const eventHandlers = new Map<string, Set<(change: OutputChangeEvent) => void>>();

  return {
    async materialize(nodes) {
      if (handlers.materialize) {
        await handlers.materialize(nodes);
      } else {
        // Default: set empty outputs via reactive API
        for (const node of nodes) {
          node.setOutputs({});
        }
      }
    },
    async destroy(node) {
      if (handlers.destroy) {
        await handlers.destroy(node);
      }
    },
    on(event: 'outputsChanged', handler: (change: OutputChangeEvent) => void) {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
      }
      eventHandlers.get(event)!.add(handler);
    },
    off(event: 'outputsChanged', handler: (change: OutputChangeEvent) => void) {
      eventHandlers.get(event)?.delete(handler);
    },
    stop() {
      eventHandlers.clear();
    },
  };
}
