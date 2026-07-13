import { afterEach, expect, it, vi } from "vitest";
import { render, resetRuntime } from "@creact-labs/creact";
import { createMemory } from "@creact-labs/example-memory";
import { App } from "../app";

afterEach(() => {
  resetRuntime();
  vi.restoreAllMocks();
});

it("deploys the counter and increments the count", async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  const memory = createMemory();

  const result = render(() => <App />, memory, "durable-counter-test");
  await result.ready;

  const nodes = result.getNodes();
  expect(nodes).toHaveLength(1);
  expect(nodes[0]?.outputs?.count).toBe(0);

  await vi.waitFor(
    () => {
      const count = result.getNodes()[0]?.outputs?.count as number;
      expect(count).toBeGreaterThan(0);
    },
    { timeout: 3000 },
  );

  result.dispose();
});
