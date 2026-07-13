import { describe, expect, it } from "vitest";
import { createInspectorStream } from "../stream";

const MARKER = "CX";
const NL = String.fromCharCode(10);

function record(obj: unknown): string {
  return MARKER + JSON.stringify(obj) + NL;
}

describe("createInspectorStream", () => {
  it("parses a tree record into nodes", () => {
    const { state, feed } = createInspectorStream();
    feed(record({ t: "tree", nodes: [{ id: "a", path: ["a"], key: "a", outputs: { count: 1 } }] }));
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0]!.outputs.count).toBe(1);
  });

  it("accumulates events, files, http and ai records", () => {
    const { state, feed } = createInspectorStream();
    feed(record({ t: "event", kind: "output", label: "a.count", ts: 1 }));
    feed(record({ t: "fs", op: "write", path: "dist/index.html", ts: 2 }));
    feed(record({ t: "http", method: "GET", url: "/x", status: 200, ms: 5, ts: 3 }));
    feed(record({ t: "ai", op: "start", node: "landing", prompt: "landing", ts: 4 }));
    feed(record({ t: "ai", op: "token", node: "landing", token: "Hello ", ts: 5 }));
    feed(record({ t: "ai", op: "token", node: "landing", token: "world", ts: 6 }));
    feed(record({ t: "ai", op: "done", node: "landing", text: "Hello world", ts: 7 }));

    expect(state.events).toHaveLength(1);
    expect(state.files).toHaveProperty("dist/index.html");
    expect(state.http[0]!.status).toBe(200);
    expect(state.ai.landing!.text).toBe("Hello world");
    expect(state.ai.landing!.done).toBe(true);
  });

  it("defaults an ai record without a node to 'ai'", () => {
    const { state, feed } = createInspectorStream();
    feed(record({ t: "ai", op: "start", prompt: "p", ts: 1 }));
    expect(state.ai.ai).toBeDefined();
  });

  it("routes non-marker lines to the console", () => {
    const { state, feed } = createInspectorStream();
    feed("Count: 0" + NL + "Count: 1" + NL);
    expect(state.console).toContain("Count: 0");
    expect(state.console).toContain("Count: 1");
  });

  it("treats a marker line with invalid JSON as console text", () => {
    const { state, feed } = createInspectorStream();
    feed(MARKER + "{not json}" + NL);
    expect(state.console).toContain("{not json}");
  });

  it("strips ANSI escapes and PTY control framing before parsing", () => {
    const { state, feed } = createInspectorStream();
    const soh = String.fromCharCode(1);
    const cr = String.fromCharCode(13);
    const esc = String.fromCharCode(27);
    const clean = record({ t: "tree", nodes: [{ id: "a", path: ["a"], key: "a", outputs: {} }] });
    // SOH framing + an ANSI colour sequence + a carriage return before newline.
    const framed = soh + esc + "[32m" + clean.replace(NL, cr + NL) + soh;
    feed(framed);
    expect(state.nodes).toHaveLength(1);
  });

  it("buffers partial lines across chunks", () => {
    const { state, feed } = createInspectorStream();
    const line = record({ t: "tree", nodes: [{ id: "a", path: ["a"], key: "a", outputs: {} }] });
    feed(line.slice(0, 10));
    expect(state.nodes).toHaveLength(0);
    feed(line.slice(10));
    expect(state.nodes).toHaveLength(1);
  });

  it("reset clears all state", () => {
    const { state, feed, reset } = createInspectorStream();
    feed(record({ t: "tree", nodes: [{ id: "a", path: ["a"], key: "a", outputs: {} }] }));
    feed(record({ t: "event", kind: "mount", label: "a", ts: 1 }));
    reset();
    expect(state.nodes).toHaveLength(0);
    expect(state.events).toHaveLength(0);
  });
});
