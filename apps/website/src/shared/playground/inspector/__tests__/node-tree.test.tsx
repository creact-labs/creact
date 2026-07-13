import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import NodeTree from "../node-tree";
import type { NodeSnapshot } from "../../stream";

describe("NodeTree", () => {
  it("shows a fallback when there are no nodes", () => {
    const { container } = render(() => <NodeTree nodes={[]} />);
    expect(container.querySelector(".cx-empty")).toBeTruthy();
  });

  it("nests children under their parent by path and summarises outputs", () => {
    const nodes: NodeSnapshot[] = [
      { id: "bucket", path: ["bucket"], key: "bucket", outputs: { status: "ready", url: "https://x" } },
      { id: "obj", path: ["bucket", "obj"], key: "obj", outputs: { published: true } },
      { id: "solo", path: ["solo"], key: "solo", outputs: {} },
    ];
    const { container } = render(() => <NodeTree nodes={nodes} />);
    const rows = container.querySelectorAll(".cx-node");
    expect(rows).toHaveLength(3);
    // status is omitted from the inline summary; other outputs are shown
    const bucketRow = [...rows].find((r) => r.textContent?.includes("bucket"))!;
    expect(bucketRow.textContent).toContain("url");
    expect(bucketRow.textContent).not.toContain("status:");
    expect(container.querySelector(".cx-badge-ready")).toBeTruthy();
  });

  it("truncates long output values", () => {
    const nodes: NodeSnapshot[] = [
      { id: "a", path: ["a"], key: "a", outputs: { note: "x".repeat(40) } },
    ];
    const { container } = render(() => <NodeTree nodes={nodes} />);
    expect(container.querySelector(".cx-node-outputs")!.textContent).toContain("…");
  });
});
