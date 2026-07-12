import { afterEach, describe, expect, it } from "vitest";
import {
  resetRuntime,
  useAsyncOutput,
} from "@creact-labs/creact";
import {
  renderTest,
  InMemoryMemory,
} from "../index";
import { h } from "../testing/testing";

afterEach(() => {
  resetRuntime();
});

describe("renderTest()", () => {
  it("renders with no-op memory by default", async () => {
    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
      });
      return null;
    }

    const result = renderTest(() => h(Node, { key: "n" }, "n"));
    await result.ready;

    expect(result.getNodes().length).toBe(1);

    result.dispose();
  });

  it("accepts custom memory via options", async () => {
    const memory = new InMemoryMemory();

    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
      });
      return null;
    }

    const result = renderTest(() => h(Node, { key: "n" }, "n"), { memory });
    await result.ready;

    // State should be saved to our custom memory
    const state = await memory.getState("test");
    expect(state).not.toBeNull();

    result.dispose();
  });

  it("accepts custom stack id via options", async () => {
    const memory = new InMemoryMemory();

    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
      });
      return null;
    }

    const result = renderTest(() => h(Node, { key: "n" }, "n"), {
      memory,
      id: "custom-stack",
    });
    await result.ready;

    const state = await memory.getState("custom-stack");
    expect(state).not.toBeNull();

    result.dispose();
  });
});
