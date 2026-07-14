import { afterEach, describe, expect, it, vi } from "vitest";
import { resetRuntime } from "@creact-labs/creact";
import { InMemoryMemory, renderTest, waitFor } from "@creact-labs/testing";

const writes: Record<string, string> = {};
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async (path: string, data: string) => {
    writes[path] = data;
  }),
}));
vi.mock("../../../claude/html-writer", () => ({
  writeHtml: vi.fn(async (prompt: string) => {
    if (prompt === "boom") throw new Error("claude is down");
    return "<!DOCTYPE html><html></html>";
  }),
}));

const { Page } = await import("../index");
const { restoreOrWrite } = await import("../index");

describe("restoreOrWrite", () => {
  it("restores a previously ready page with a file", () => {
    const decision = restoreOrWrite({ state: "ready", file: "out/a.html", error: undefined });
    expect(decision).toEqual({ restored: true, next: { state: "ready", file: "out/a.html", error: undefined } });
  });

  it("starts writing when there is no prior file", () => {
    const decision = restoreOrWrite({ state: "ready", file: undefined, error: undefined });
    expect(decision.restored).toBe(false);
    expect(decision.next.state).toBe("writing");
  });

  it("starts writing on a fresh page", () => {
    const decision = restoreOrWrite(undefined);
    expect(decision).toEqual({ restored: false, next: { state: "writing", file: undefined, error: undefined } });
  });
});

describe("Page", () => {
  afterEach(() => {
    resetRuntime();
    for (const key of Object.keys(writes)) delete writes[key];
  });

  it("writes the html and reports a ready state", async () => {
    const states: Record<string, string> = {};
    const result = renderTest(() => (
      <Page key="p" slug="a" prompt="a bakery" onState={(slug, outputs) => { states[slug] = outputs.state; }} />
    ));
    await result.ready;
    const html = await waitFor(() => writes["out/a.html"]);
    expect(html).toContain("<!DOCTYPE html>");
    expect(states.a).toBe("ready");
    result.dispose();
  });

  it("reports a failed state when the writer throws", async () => {
    const states: Record<string, { state: string; error: string | undefined }> = {};
    const result = renderTest(() => (
      <Page key="p" slug="b" prompt="boom" onState={(slug, outputs) => { states[slug] = { state: outputs.state, error: outputs.error }; }} />
    ));
    await result.ready;
    await waitFor(() => (states.b?.state === "failed" ? states.b : undefined));
    expect(states.b.state).toBe("failed");
    expect(states.b.error).toBe("claude is down");
    result.dispose();
  });

  it("restores a ready page from memory without rewriting", async () => {
    const memory = new InMemoryMemory();
    const first = renderTest(
      () => <Page key="p" slug="a" prompt="a bakery" onState={() => undefined} />,
      { memory, id: "restore" },
    );
    await first.ready;
    await waitFor(() => writes["out/a.html"]);
    first.dispose();
    delete writes["out/a.html"];

    const states: Record<string, string> = {};
    const second = renderTest(
      () => <Page key="p" slug="a" prompt="a bakery" onState={(slug, outputs) => { states[slug] = outputs.state; }} />,
      { memory, id: "restore" },
    );
    await second.ready;
    expect(states.a).toBe("ready");
    expect(writes["out/a.html"]).toBeUndefined();
    second.dispose();
  });
});
