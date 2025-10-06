// Helper functions for extracting outputs from CloudDOM
// Outputs live inside CloudDOM nodes, not as a separate field

import { CloudDOMNode } from '@/core/types';

/**
 * Extract outputs from CloudDOM nodes
 *
 * Walks the CloudDOM tree and collects all outputs from nodes.
 * Outputs are formatted as nodeId.outputKey (e.g., 'registry.url').
 *
 * @param cloudDOM - CloudDOM tree
 * @returns Outputs object with keys in format nodeId.outputKey
 */
export function extractOutputs(cloudDOM: CloudDOMNode[]): Record<string, any> {
  const outputs: Record<string, any> = {};

  if (!Array.isArray(cloudDOM)) {
    return outputs;
  }

  const walk = (nodes: CloudDOMNode[]) => {
    if (!nodes || !Array.isArray(nodes)) {
      return;
    }

    for (const node of nodes) {
      if (!node) {
        continue;
      }

      // Extract outputs from node
      if (node.outputs && typeof node.outputs === 'object') {
        for (const [key, value] of Object.entries(node.outputs)) {
          // Output name format: nodeId.outputKey
          const outputName = `${node.id}.${key}`;
          outputs[outputName] = value;
        }
      }

      // Recursively walk children
      if (node.children && Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(cloudDOM);
  return outputs;
}
