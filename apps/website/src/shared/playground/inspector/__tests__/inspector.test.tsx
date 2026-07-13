import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import Inspector from "..";
import type { InspectorState } from "../../stream";

const state: InspectorState = {
  nodes: [{ id: "c", path: ["c"], key: "counter", outputs: { count: 1 } }],
  events: [{ kind: "mount", label: "counter", ts: 1 }],
  files: {},
  http: [],
  ai: {},
  console: "",
};

describe("Inspector", () => {
  it("renders the panel, resource tree and timeline together", () => {
    const { container } = render(() => <Inspector state={state} panel="counter" />);
    expect(container.querySelector(".cx-panel-frame")).toBeTruthy();
    expect(container.querySelector(".cx-tree")).toBeTruthy();
    expect(container.querySelector(".cx-timeline")).toBeTruthy();
    expect(container.querySelector(".cx-counter-value")).toBeTruthy();
  });
});
