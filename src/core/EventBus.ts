// CloudDOM Event Bus - Centralized event system for deployment lifecycle
// Handles CloudDOM event callbacks without coupling to CloudDOMBuilder

import { CloudDOMNode, CloudDOMEventContext, CloudDOMEventCallbacks } from './types';

/**
 * CloudDOM Event Bus - Centralized event system for deployment lifecycle
 * 
 * Provides a clean way to trigger CloudDOM event callbacks without
 * coupling to specific classes like CloudDOMBuilder or StateMachine.
 * 
 * REQ-2.3: CloudDOM event callbacks for deployment lifecycle
 * REQ-3.2: Error handling with component context
 */
export class CloudDOMEventBus {
  /**
   * Trigger CloudDOM event callbacks for a resource
   * 
   * Called during deployment lifecycle to notify parent components
   * about their child resources' deployment events.
   *
   * @param node - CloudDOM node with event callbacks
   * @param phase - Deployment phase ('deploy', 'error', 'destroy')
   * @param error - Error object (only for 'error' phase)
   */
  static async triggerEventCallbacks(
    node: CloudDOMNode, 
    phase: 'deploy' | 'error' | 'destroy',
    error?: Error
  ): Promise<void> {
    if (!node.eventCallbacks) {
      return; // No callbacks to trigger
    }

    // Create event context
    const context: CloudDOMEventContext = {
      resourceId: node.id,
      path: node.path,
      construct: node.construct,
      props: { ...node.props }, // Clone to prevent mutations
      outputs: node.outputs ? { ...node.outputs } : undefined,
      phase,
      timestamp: Date.now(),
    };

    try {
      // Trigger appropriate callback based on phase
      switch (phase) {
        case 'deploy':
          if (node.eventCallbacks.onDeploy) {
            await node.eventCallbacks.onDeploy(context);
          }
          break;
          
        case 'error':
          if (node.eventCallbacks.onError && error) {
            await node.eventCallbacks.onError(context, error);
          }
          break;
          
        case 'destroy':
          if (node.eventCallbacks.onDestroy) {
            await node.eventCallbacks.onDestroy(context);
          }
          break;
      }
    } catch (callbackError) {
      // Don't let callback errors break deployment
      console.error(
        `[CloudDOMEventBus] Event callback failed for ${node.id} (${phase}):`, 
        callbackError
      );
    }
  }

  /**
   * Trigger event callbacks for all nodes in a CloudDOM tree
   * 
   * Recursively walks the tree and triggers callbacks for each node.
   *
   * @param nodes - CloudDOM nodes to trigger events for
   * @param phase - Deployment phase
   * @param error - Error object (only for 'error' phase)
   */
  static async triggerEventCallbacksRecursive(
    nodes: CloudDOMNode[], 
    phase: 'deploy' | 'error' | 'destroy',
    error?: Error
  ): Promise<void> {
    for (const node of nodes) {
      // Trigger callback for this node
      await CloudDOMEventBus.triggerEventCallbacks(node, phase, error);
      
      // Recursively trigger for children
      if (node.children && node.children.length > 0) {
        await CloudDOMEventBus.triggerEventCallbacksRecursive(node.children, phase, error);
      }
    }
  }

  /**
   * Trigger event callbacks for a specific list of nodes by ID
   * 
   * Useful for triggering events for specific resources during deployment.
   *
   * @param allNodes - All CloudDOM nodes to search in
   * @param nodeIds - IDs of nodes to trigger events for
   * @param phase - Deployment phase
   * @param error - Error object (only for 'error' phase)
   */
  static async triggerEventCallbacksForNodes(
    allNodes: CloudDOMNode[],
    nodeIds: string[],
    phase: 'deploy' | 'error' | 'destroy',
    error?: Error
  ): Promise<void> {
    // Build a map for fast lookup
    const nodeMap = new Map<string, CloudDOMNode>();
    
    const buildMap = (nodes: CloudDOMNode[]) => {
      for (const node of nodes) {
        nodeMap.set(node.id, node);
        if (node.children && node.children.length > 0) {
          buildMap(node.children);
        }
      }
    };
    
    buildMap(allNodes);
    
    // Trigger events for specified nodes
    for (const nodeId of nodeIds) {
      const node = nodeMap.get(nodeId);
      if (node) {
        await CloudDOMEventBus.triggerEventCallbacks(node, phase, error);
      }
    }
  }

  /**
   * Check if any nodes in a tree have event callbacks
   * 
   * Useful for optimization - skip event processing if no callbacks exist.
   *
   * @param nodes - CloudDOM nodes to check
   * @returns True if any node has event callbacks
   */
  static hasEventCallbacks(nodes: CloudDOMNode[]): boolean {
    for (const node of nodes) {
      if (node.eventCallbacks && Object.keys(node.eventCallbacks).length > 0) {
        return true;
      }
      
      if (node.children && node.children.length > 0) {
        if (CloudDOMEventBus.hasEventCallbacks(node.children)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Get all nodes with event callbacks from a tree
   * 
   * Useful for debugging and introspection.
   *
   * @param nodes - CloudDOM nodes to search
   * @returns Array of nodes that have event callbacks
   */
  static getNodesWithEventCallbacks(nodes: CloudDOMNode[]): CloudDOMNode[] {
    const result: CloudDOMNode[] = [];
    
    for (const node of nodes) {
      if (node.eventCallbacks && Object.keys(node.eventCallbacks).length > 0) {
        result.push(node);
      }
      
      if (node.children && node.children.length > 0) {
        result.push(...CloudDOMEventBus.getNodesWithEventCallbacks(node.children));
      }
    }
    
    return result;
  }
}