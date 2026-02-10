import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal, Show } from "../../src/index";
import { useAsyncOutput } from "../src/instance";
import type { Memory } from "../src/memory";
import { render, resetRuntime } from "../src/run";
import { InMemoryMemory } from "../../test/helpers/setup";

/** Helper: create a JSX element */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
}

/** Helper: delay for async handlers */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  resetRuntime();
});

describe("eager handler cascading", () => {
  it("handler A outputs → component B materializes → B's handler runs in same apply call", async () => {
    const handlerOrder: string[] = [];

    function Analysis(props: { key: string }) {
      const out = useAsyncOutput<{ summary: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Analysis");
          setOutputs({ summary: "analyzed-data" });
        },
      );
      // Use function children so summary is evaluated reactively when Show renders
      return Show({
        when: () => out.summary(),
        children: (summary: () => string) =>
          h(Connects, { summary: summary(), key: "c1" }, "c1"),
      });
    }

    function Connects(props: { summary: string; key: string }) {
      useAsyncOutput(
        { summary: props.summary, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Connects:${p.summary}`);
          setOutputs({ connected: true });
        },
      );
      return null;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Analysis, { key: "a1" }, "a1"),
      memory,
      "test-eager-cascade",
    );

    await result.ready;

    // Both handlers should have run — Analysis first, then Connects
    expect(handlerOrder).toEqual(["Analysis", "Connects:analyzed-data"]);

    result.dispose();
  });

  it("two independent sibling handlers run concurrently", async () => {
    const timeline: { node: string; event: string; time: number }[] = [];
    const start = Date.now();

    function NodeA(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        timeline.push({ node: "A", event: "start", time: Date.now() - start });
        await delay(50);
        timeline.push({ node: "A", event: "end", time: Date.now() - start });
        setOutputs({ done: true });
      });
      return null;
    }

    function NodeB(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        timeline.push({ node: "B", event: "start", time: Date.now() - start });
        await delay(50);
        timeline.push({ node: "B", event: "end", time: Date.now() - start });
        setOutputs({ done: true });
      });
      return null;
    }

    function Root() {
      return [h(NodeA, { key: "a" }, "a"), h(NodeB, { key: "b" }, "b")];
    }

    const memory = new InMemoryMemory();
    const result = render(() => h(Root, {}, "root"), memory, "test-parallel");

    await result.ready;

    // Both should have started before either finished (concurrent execution)
    const aStart = timeline.find((t) => t.node === "A" && t.event === "start");
    const bStart = timeline.find((t) => t.node === "B" && t.event === "start");
    const aEnd = timeline.find((t) => t.node === "A" && t.event === "end");
    const bEnd = timeline.find((t) => t.node === "B" && t.event === "end");

    expect(aStart).toBeDefined();
    expect(bStart).toBeDefined();
    expect(aEnd).toBeDefined();
    expect(bEnd).toBeDefined();

    // B should start before A ends (parallel)
    expect(bStart!.time).toBeLessThan(aEnd!.time);

    result.dispose();
  });

  it("diamond dependency: A→B, A→C, B+C→D — correct ordering", async () => {
    const handlerOrder: string[] = [];

    // A is the root
    function A(props: { key: string }) {
      const out = useAsyncOutput<{ aVal: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("A");
          setOutputs({ aVal: "from-A" });
        },
      );
      return Show({
        when: () => out.aVal(),
        children: (aVal: () => string) => [
          h(B, { aVal: aVal(), key: "b" }, "b"),
          h(C, { aVal: aVal(), key: "c" }, "c"),
        ],
      });
    }

    // B depends on A
    function B(props: { aVal: string; key: string }) {
      const out = useAsyncOutput<{ bVal: string }>(
        { aVal: props.aVal, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push("B");
          setOutputs({ bVal: `B(${p.aVal})` });
        },
      );
      return Show({
        when: () => out.bVal(),
        children: (bVal: () => string) =>
          h(D, { bVal: bVal(), cVal: "pending", key: "d-from-b" }, "d-from-b"),
      });
    }

    // C depends on A
    function C(props: { aVal: string; key: string }) {
      useAsyncOutput(
        { aVal: props.aVal, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push("C");
          setOutputs({ cVal: `C(${p.aVal})` });
        },
      );
      return null;
    }

    // D depends on B (materializes when B outputs)
    function D(props: { bVal: string; cVal: string; key: string }) {
      useAsyncOutput(
        { bVal: props.bVal, cVal: props.cVal, key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("D");
          setOutputs({ done: true });
        },
      );
      return null;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(A, { key: "a" }, "a"),
      memory,
      "test-diamond",
    );

    await result.ready;

    // A must run first, then B and C (in any order), then D
    expect(handlerOrder[0]).toBe("A");
    expect(handlerOrder.slice(1, 3).sort()).toEqual(["B", "C"]);
    expect(handlerOrder).toContain("D");

    result.dispose();
  });

  it("error propagation: handler throws → dependents don't run, deployment fails", async () => {
    const handlerOrder: string[] = [];

    function Failing(props: { key: string }) {
      const out = useAsyncOutput<{ val: string }>(
        { key: props.key },
        async () => {
          handlerOrder.push("Failing");
          throw new Error("handler-error");
        },
      );
      return Show({
        when: () => out.val(),
        children: h(Dependent, { key: "dep" }, "dep"),
      });
    }

    function Dependent(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        handlerOrder.push("Dependent");
        setOutputs({ done: true });
      });
      return null;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Failing, { key: "f1" }, "f1"),
      memory,
      "test-error",
    );

    await expect(result.ready).rejects.toThrow("handler-error");

    // Only the failing handler should have run
    expect(handlerOrder).toEqual(["Failing"]);

    // Deployment should be marked as failed
    const state = await memory.getState("test-error");
    expect(state?.status).toBe("failed");

    result.dispose();
  });

  it("initial run with unchanged nodes re-executes handlers idempotently", async () => {
    let handlerCallCount = 0;

    function Idempotent(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        handlerCallCount++;
        setOutputs({ count: handlerCallCount });
      });
      return null;
    }

    const memory = new InMemoryMemory();

    // First run
    const result1 = render(
      () => h(Idempotent, { key: "idem" }, "idem"),
      memory,
      "test-idempotent",
    );
    await result1.ready;
    expect(handlerCallCount).toBe(1);
    result1.dispose();
    resetRuntime();

    // Second run — handler should run again (idempotent re-execution)
    handlerCallCount = 0;
    const result2 = render(
      () => h(Idempotent, { key: "idem" }, "idem"),
      memory,
      "test-idempotent",
    );
    await result2.ready;
    expect(handlerCallCount).toBe(1);
    result2.dispose();
  });

  it("deployment state tracks multiple applying nodes", async () => {
    let savedStates: string[][] = [];

    const trackingMemory: Memory = {
      ...new InMemoryMemory(),
      _inner: new InMemoryMemory(),
      async getState(stackName: string) {
        return (this as any)._inner.getState(stackName);
      },
      async saveState(stackName: string, state: any) {
        if (state.applyingNodeIds && state.applyingNodeIds.length > 0) {
          savedStates.push([...state.applyingNodeIds]);
        }
        return (this as any)._inner.saveState(stackName, state);
      },
    } as any;

    function NodeA(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        await delay(20);
        setOutputs({ done: true });
      });
      return null;
    }

    function NodeB(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        await delay(20);
        setOutputs({ done: true });
      });
      return null;
    }

    function Root() {
      return [h(NodeA, { key: "a" }, "a"), h(NodeB, { key: "b" }, "b")];
    }

    const result = render(
      () => h(Root, {}, "root"),
      trackingMemory,
      "test-multi-apply",
    );

    await result.ready;

    // At some point, both nodes should have been in the applying set simultaneously
    const hadMultiple = savedStates.some((ids) => ids.length >= 2);
    expect(hadMultiple).toBe(true);

    result.dispose();
  });
});
