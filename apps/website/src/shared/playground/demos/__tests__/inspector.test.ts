import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inspect,
  InspectMemory,
  VirtualFs,
  mockFetch,
  mockAI,
} from "../inspector.mjs";

function captureStdout() {
  const chunks: string[] = [];
  const spy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      chunks.push(String(chunk));
      return true;
    });
  return { chunks, spy };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("InspectMemory", () => {
  it("stores and returns deployment state, null when absent", async () => {
    const mem = new InspectMemory();
    expect(await mem.getState("s")).toBeNull();
    await mem.saveState("s", { nodes: {} });
    expect(await mem.getState("s")).toEqual({ nodes: {} });
  });
});

describe("VirtualFs", () => {
  it("writes and reads files and emits fs records", () => {
    const { chunks } = captureStdout();
    const fs = new VirtualFs();
    fs.write("dist/index.html", "<h1>hi</h1>");
    expect(fs.read("dist/index.html")).toBe("<h1>hi</h1>");
    expect(fs.snapshot()).toEqual({ "dist/index.html": "<h1>hi</h1>" });
    expect(chunks.join("")).toContain('"t":"fs"');
    expect(chunks.join("")).toContain("wrote dist/index.html");
  });
});

describe("mockFetch", () => {
  it("returns a matched route and logs the call", async () => {
    const { chunks } = captureStdout();
    const fetch = mockFetch({ "/ok": { status: 200, body: '{"a":1}' } });
    const res = await fetch("/ok");
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ a: 1 });
    expect(chunks.join("")).toContain('"t":"http"');
  });

  it("falls back to a default 200 for unknown routes and honours delay", async () => {
    captureStdout();
    const fetch = mockFetch({ "/slow": { status: 503, delay: 5 } });
    const down = await fetch("/slow", { method: "POST" });
    expect(down.ok).toBe(false);
    expect(down.status).toBe(503);
    const unknown = await fetch("/missing");
    expect(unknown.status).toBe(200);
    expect(await unknown.text()).toBe("");
  });
});

describe("mockAI", () => {
  it("streams scripted tokens and resolves the full text", async () => {
    const { chunks } = captureStdout();
    const ai = mockAI({ landing: "Hello world", default: "fallback" });
    const text = await ai.generate("landing", { node: "landing" });
    expect(text).toBe("Hello world");
    const out = chunks.join("");
    expect(out).toContain('"op":"start"');
    expect(out).toContain('"op":"token"');
    expect(out).toContain('"op":"done"');
  });

  it("uses the default script when the prompt is unknown", async () => {
    captureStdout();
    const ai = mockAI({ default: "fallback" });
    expect(await ai.generate("unknown")).toBe("fallback");
  });
});

describe("inspect", () => {
  it("emits a tree snapshot and per-field output events on change", () => {
    vi.useFakeTimers();
    const { chunks } = captureStdout();
    const nodes = [
      {
        id: "a",
        path: ["a"],
        outputs: { count: 0, obj: { x: 1 }, fn: () => {}, nil: null, s: "hi" },
      },
    ];
    const result = { ready: Promise.resolve(), getNodes: () => nodes };
    const stop = inspect(result, { interval: 100 });

    nodes[0]!.outputs = { count: 1, obj: { x: 1 }, fn: () => {}, nil: null, s: "hi" };
    vi.advanceTimersByTime(100);
    stop();

    const out = chunks.join("");
    expect(out).toContain('"t":"tree"');
    expect(out).toContain('"kind":"mount"');
    expect(out).toContain('"kind":"output"');
  });

  it("survives getNodes throwing", () => {
    vi.useFakeTimers();
    captureStdout();
    const result = {
      ready: Promise.resolve(),
      getNodes: () => {
        throw new Error("not ready");
      },
    };
    const stop = inspect(result, { interval: 100 });
    expect(() => vi.advanceTimersByTime(100)).not.toThrow();
    stop();
  });
});
