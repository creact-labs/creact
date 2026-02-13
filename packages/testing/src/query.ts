import type { InstanceNode } from "@creact-labs/creact";

export function findNode(
  nodes: InstanceNode[],
  predicate: (n: InstanceNode) => boolean,
): InstanceNode {
  const found = nodes.find(predicate);
  if (!found) throw new Error("No node matching predicate");
  return found;
}

export function queryNodes(
  nodes: InstanceNode[],
  predicate: (n: InstanceNode) => boolean,
): InstanceNode[] {
  return nodes.filter(predicate);
}

export function readOutput(node: InstanceNode, key: string): any {
  const signal = node.outputSignals.get(key);
  if (!signal) return undefined;
  return signal[0]();
}
