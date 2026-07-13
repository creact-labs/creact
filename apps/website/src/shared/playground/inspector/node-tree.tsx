import { type Component, For, Show } from "solid-js";
import type { NodeSnapshot } from "../stream";
import { statusOf, STATUS_LABEL } from "./status";

interface TreeNode {
  node: NodeSnapshot;
  children: TreeNode[];
}

// Rebuild the resource tree from each node's `path` (root → leaf address).
// A node's parent is the node whose path is this path minus its last segment.
function buildTree(nodes: NodeSnapshot[]): TreeNode[] {
  const byPath = new Map<string, TreeNode>();
  for (const node of nodes) {
    byPath.set(node.path.join("/"), { node, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const entry of byPath.values()) {
    const parentPath = entry.node.path.slice(0, -1).join("/");
    const parent = byPath.get(parentPath);
    if (parent) parent.children.push(entry);
    else roots.push(entry);
  }
  return roots;
}

function summarize(outputs: Record<string, unknown>): string {
  const parts = Object.entries(outputs)
    .filter(([key]) => key !== "status")
    .map(([key, value]) => `${key}: ${format(value)}`);
  return parts.join("  ");
}

function format(value: unknown): string {
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  return s.length > 24 ? s.slice(0, 23) + "…" : s;
}

const Row: Component<{ tree: TreeNode; depth: number }> = (props) => {
  const status = () => statusOf(props.tree.node);
  return (
    <>
      <div class="cx-node" style={{ "padding-left": `${props.depth * 16 + 8}px` }}>
        <span class={`cx-badge cx-badge-${status()}`} title={STATUS_LABEL[status()]} />
        <span class="cx-node-key">{props.tree.node.key}</span>
        <span class="cx-node-outputs">{summarize(props.tree.node.outputs)}</span>
      </div>
      <For each={props.tree.children}>
        {(child) => <Row tree={child} depth={props.depth + 1} />}
      </For>
    </>
  );
};

const NodeTree: Component<{ nodes: NodeSnapshot[] }> = (props) => {
  const roots = () => buildTree(props.nodes);
  return (
    <div class="cx-tree">
      <div class="cx-panel-title">Resource tree</div>
      <Show when={roots().length} fallback={<div class="cx-empty">Waiting for nodes…</div>}>
        <For each={roots()}>{(root) => <Row tree={root} depth={0} />}</For>
      </Show>
    </div>
  );
};

export default NodeTree;
