import { afterEach, describe, expect, it } from "vitest";
import { createSignal, Show } from "../../src/index";
import { useAsyncOutput } from "../src/instance";
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

describe("settled()", () => {
  it("resolves immediately when no async handlers exist", async () => {
    function Empty() {
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(() => h(Empty, {}, "root"), memory, "test-settled");

    await result.ready;
    // settled() should resolve immediately — no pending work
    await result.settled();

    result.dispose();
  });

  it("resolves after all async handlers complete", async () => {
    const handlerOrder: string[] = [];

    function AsyncNode(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        await delay(50);
        handlerOrder.push("handler-done");
        setOutputs({ done: true });
      });
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(AsyncNode, { key: "a" }, "a"),
      memory,
      "test-settled-async",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder).toEqual(["handler-done"]);

    result.dispose();
  });

  it("waits for reactive cascades (handler A → setOutputs → Show materializes → handler B)", async () => {
    const handlerOrder: string[] = [];

    function Parent(props: { key: string }) {
      const out = useAsyncOutput<{ url: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("parent");
          setOutputs({ url: "http://example.com" });
        },
      );
      return Show({
        when: () => out.url(),
        children: (url: () => string) =>
          h(Child, { url: url(), key: "child" }, "child"),
      });
    }

    function Child(props: { url: string; key: string }) {
      useAsyncOutput(
        { url: props.url, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`child:${p.url}`);
          setOutputs({ connected: true });
        },
      );
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Parent, { key: "p" }, "p"),
      memory,
      "test-settled-cascade",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder).toEqual(["parent", "child:http://example.com"]);

    result.dispose();
  });

  it("waits for debounced saveState to complete", async () => {
    let saveCalled = false;

    const memory = new InMemoryMemory();
    const origSave = memory.saveState.bind(memory);
    memory.saveState = async (stackName, state) => {
      saveCalled = true;
      return origSave(stackName, state);
    };

    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ value: 1 });
      });
      return <></>;
    }

    const result = render(
      () => h(Node, { key: "n" }, "n"),
      memory,
      "test-settled-save",
    );

    await result.ready;
    await result.settled();

    // saveState should have been called (initial deployment + any debounced saves)
    expect(saveCalled).toBe(true);

    result.dispose();
  });

  it("multiple concurrent settled() calls all resolve", async () => {
    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        await delay(30);
        setOutputs({ done: true });
      });
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Node, { key: "n" }, "n"),
      memory,
      "test-settled-concurrent",
    );

    await result.ready;

    // Call settled() multiple times concurrently
    const [r1, r2, r3] = await Promise.all([
      result.settled(),
      result.settled(),
      result.settled(),
    ]);

    // All should resolve (void)
    expect(r1).toBeUndefined();
    expect(r2).toBeUndefined();
    expect(r3).toBeUndefined();

    result.dispose();
  });

  it("throws if runtime is disposed", async () => {
    function Empty() {
      return <></>;
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Empty, {}, "root"),
      memory,
      "test-settled-disposed",
    );

    await result.ready;
    result.dispose();

    await expect(result.settled()).rejects.toThrow(
      "Cannot call settled() on disposed runtime",
    );
  });
});
