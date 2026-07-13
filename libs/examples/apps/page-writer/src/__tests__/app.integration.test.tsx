import { afterEach, describe, expect, it, vi } from "vitest";
import { resetRuntime } from "@creact-labs/creact";
import { renderTest, waitFor } from "@creact-labs/testing";

const writes: Record<string, string> = {};
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async (path: string, data: string) => {
    writes[path] = data;
  }),
}));
vi.mock("../claude/html-writer", async () => {
  const actual = await vi.importActual<typeof import("../claude/html-writer")>("../claude/html-writer");
  return { ...actual, writeHtml: vi.fn(async () => "<!DOCTYPE html><html></html>") };
});

const { App } = await import("../app");

const port = 39117;
const base = `http://localhost:${port}`;

async function post(prompt: unknown): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${base}/pages`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
  return { status: response.status, body: await response.json() };
}

describe("App", () => {
  afterEach(() => {
    resetRuntime();
    for (const key of Object.keys(writes)) delete writes[key];
    vi.unstubAllEnvs();
  });

  it("accepts a prompt, writes the page, and lists it as latest", async () => {
    vi.stubEnv("PORT", String(port));
    const result = renderTest(() => <App key="root" />);
    await result.ready;

    const created = await post("a sourdough bakery");
    expect(created.status).toBe(202);
    expect(created.body).toMatchObject({ slug: "a-sourdough-bakery" });

    const html = await waitFor(() => writes["out/a-sourdough-bakery.html"]);
    expect(html).toContain("<!DOCTYPE html>");

    const listed = await (await fetch(`${base}/pages`)).json();
    expect(listed).toEqual([
      expect.objectContaining({ slug: "a-sourdough-bakery", state: "ready", latest: true }),
    ]);

    const duplicate = await post("a sourdough bakery");
    expect(duplicate.status).toBe(202);
    const stillOne = await (await fetch(`${base}/pages`)).json();
    expect(stillOne).toHaveLength(1);

    result.dispose();
  });
});
