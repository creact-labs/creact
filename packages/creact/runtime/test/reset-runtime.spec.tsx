import { afterEach, describe, expect, it, vi } from "vitest";
import { useAsyncOutput } from "../src/instance";
import { render, resetRuntime } from "../src/run";
import { InMemoryMemory } from "../../test/helpers/setup";

/** Helper: create a JSX element */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
}

afterEach(() => {
  resetRuntime();
});

describe("resetRuntime()", () => {
  it("calls cleanup functions on all registered nodes", async () => {
    const cleanupCalls: string[] = [];

    function NodeA(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
        return () => {
          cleanupCalls.push("A");
        };
      });
      return <></>;
    }

    function NodeB(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
        return () => {
          cleanupCalls.push("B");
        };
      });
      return <></>;
    }

    function Root() {
      return [h(NodeA, { key: "a" }, "a"), h(NodeB, { key: "b" }, "b")];
    }

    const memory = new InMemoryMemory();
    const result = render(() => h(Root, {}, "root"), memory, "test-reset");
    await result.ready;

    expect(cleanupCalls).toEqual([]);

    resetRuntime();

    // Both cleanup functions should have been called
    expect(cleanupCalls).toContain("A");
    expect(cleanupCalls).toContain("B");
    expect(cleanupCalls.length).toBe(2);
  });

  it("cancels debounced saveState timers (no late saves after reset)", async () => {
    const memory = new InMemoryMemory();
    let saveCountAfterReset = 0;

    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ value: 1 });
      });
      return <></>;
    }

    const result = render(
      () => h(Node, { key: "n" }, "n"),
      memory,
      "test-reset-timers",
    );
    await result.ready;

    // Reset runtime (should cancel any debounced saves)
    resetRuntime();

    // Track saves after reset
    const origSave = memory.saveState.bind(memory);
    memory.saveState = async (stackName, state) => {
      saveCountAfterReset++;
      return origSave(stackName, state);
    };

    // Wait longer than debounce period (100ms)
    await new Promise((r) => setTimeout(r, 200));

    // No saves should have fired after reset
    expect(saveCountAfterReset).toBe(0);
  });

  it("clears nodeOwnership — no 'Duplicate resource ID' errors on re-render", async () => {
    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
      });
      return <></>;
    }

    const memory = new InMemoryMemory();

    // First render
    const result1 = render(
      () => h(Node, { key: "n" }, "n"),
      memory,
      "test-reset-ownership",
    );
    await result1.ready;

    // Reset
    resetRuntime();

    // Second render with same node IDs should not throw
    const memory2 = new InMemoryMemory();
    const result2 = render(
      () => h(Node, { key: "n" }, "n"),
      memory2,
      "test-reset-ownership",
    );
    await result2.ready;

    // Should work fine
    expect(result2.getNodes().length).toBe(1);

    result2.dispose();
  });

  it("after resetRuntime(), a fresh render() works cleanly", async () => {
    const handlerCalls: string[] = [];

    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        handlerCalls.push("handler");
        setOutputs({ value: 42 });
      });
      return <></>;
    }

    // First render
    const memory1 = new InMemoryMemory();
    const result1 = render(
      () => h(Node, { key: "n" }, "n"),
      memory1,
      "test-fresh",
    );
    await result1.ready;
    expect(handlerCalls).toEqual(["handler"]);

    // Reset everything
    resetRuntime();

    // Second render should work cleanly
    const memory2 = new InMemoryMemory();
    handlerCalls.length = 0;

    const result2 = render(
      () => h(Node, { key: "n" }, "n"),
      memory2,
      "test-fresh",
    );
    await result2.ready;

    expect(handlerCalls).toEqual(["handler"]);
    expect(result2.getNodes().length).toBe(1);

    result2.dispose();
  });
});
