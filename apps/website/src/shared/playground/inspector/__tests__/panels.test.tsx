import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import Panel from "../panels";
import type { InspectorState } from "../../stream";

function state(partial: Partial<InspectorState>): InspectorState {
  return {
    nodes: [],
    events: [],
    files: {},
    http: [],
    ai: {},
    console: "",
    ...partial,
  };
}

describe("Panel", () => {
  it("counter panel shows the ticking count", () => {
    const s = state({
      nodes: [{ id: "c", path: ["c"], key: "counter", outputs: { count: 7 } }],
    });
    const { container } = render(() => <Panel kind="counter" state={s} />);
    expect(container.querySelector(".cx-counter-value")!.textContent).toBe("7");
  });

  it("uptime panel renders a card per probed target", () => {
    const s = state({
      nodes: [
        { id: "api", path: ["api"], key: "api", outputs: { status: "up", code: 200 } },
        { id: "cdn", path: ["cdn"], key: "cdn", outputs: { status: "down", code: 503 } },
      ],
    });
    const { container } = render(() => <Panel kind="uptime" state={s} />);
    expect(container.querySelectorAll(".cx-card")).toHaveLength(2);
    expect(container.querySelector(".cx-card-failed")).toBeTruthy();
  });

  it("fs panel lists written files", () => {
    const s = state({ files: { "dist/index.html": "", "dist/about.html": "" } });
    const { container } = render(() => <Panel kind="fs" state={s} />);
    expect(container.querySelectorAll(".cx-fs-file")).toHaveLength(2);
  });

  it("ai panel streams the generated text with a cursor while pending", () => {
    const s = state({
      ai: { landing: { node: "landing", prompt: "landing", text: "Hello", done: false } },
    });
    const { container } = render(() => <Panel kind="ai" state={s} />);
    expect(container.querySelector(".cx-ai-text")!.textContent).toContain("Hello");
    expect(container.querySelector(".cx-ai-cursor")).toBeTruthy();
  });

  it("tenant panel renders a card per tenant node", () => {
    const s = state({
      nodes: [
        { id: "us", path: ["us"], key: "us-east-1", outputs: { status: "ready", ready: true } },
        { id: "eu", path: ["eu"], key: "eu-west-1", outputs: { status: "deploying" } },
      ],
    });
    const { container } = render(() => <Panel kind="tenant" state={s} />);
    expect(container.querySelectorAll(".cx-card")).toHaveLength(2);
    expect(container.querySelector(".cx-card-deploying")).toBeTruthy();
  });

  it("panels show their empty state before data arrives", () => {
    const empty = state({});
    for (const kind of ["counter", "uptime", "fs", "ai", "tenant"] as const) {
      const { container } = render(() => <Panel kind={kind} state={empty} />);
      expect(container.querySelector(".cx-empty")).toBeTruthy();
    }
  });
});
