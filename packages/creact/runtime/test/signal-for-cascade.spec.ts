import { afterEach, describe, expect, it } from "vitest";
import { createSignal, For, Fragment } from "../../src/index";
import { useAsyncOutput } from "../src/instance";
import { render, resetRuntime } from "../src/run";
import { InMemoryMemory } from "../../test/helpers/setup";

/** Helper: create a JSX element without JSX syntax (like Solid's tests) */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
}

afterEach(() => {
  resetRuntime();
});

describe("signal write inside handler → For cascade", () => {
  it("signal write inside handler triggers For to mount new children", async () => {
    const handlerOrder: string[] = [];
    const [items, setItems] = createSignal<string[]>([]);

    function Parent(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Parent");
          setItems(["a", "b", "c"]);
          setOutputs({ status: "ready" });
        },
      );
      return For({
        each: items,
        keyFn: (s: string) => s,
        children: (item: () => string) =>
          h(Child, { name: item(), key: item() }, item()),
      });
    }

    function Child(props: { name: string; key: string }) {
      useAsyncOutput(
        { name: props.name, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Child:${p.name}`);
          setOutputs({ created: true });
        },
      );
      return h(Fragment, {});
    }

    const mem = new InMemoryMemory();
    const result = render(
      () => h(Parent, { key: "p" }, "p"),
      mem,
      "test-signal-for",
    );

    await result.ready;
    await result.settled();

    // Parent ran, then 3 children should have cascaded
    expect(handlerOrder[0]).toBe("Parent");
    expect(handlerOrder).toContain("Child:a");
    expect(handlerOrder).toContain("Child:b");
    expect(handlerOrder).toContain("Child:c");
    expect(handlerOrder.length).toBe(4);

    // All 4 nodes should be in the tree
    const nodes = result.getNodes();
    expect(nodes.length).toBe(4);

    result.dispose();
  });

  it("setOutputs with Map value fires signal correctly", async () => {
    const handlerOrder: string[] = [];

    function Registry(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Registry");
          setOutputs({
            files: new Map([
              ["a.ts", "console.log('a')"],
              ["b.ts", "console.log('b')"],
            ]),
          });
        },
      );
      return h(Fragment, {});
    }

    const mem = new InMemoryMemory();
    const result = render(
      () => h(Registry, { key: "r" }, "r"),
      mem,
      "test-map-output",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder).toEqual(["Registry"]);

    const nodes = result.getNodes();
    expect(nodes.length).toBe(1);
    expect(nodes[0]!.outputs?.files).toBeInstanceOf(Map);
    expect((nodes[0]!.outputs?.files as Map<string, string>).size).toBe(2);

    result.dispose();
  });

  it("second setOutputs with different Map triggers signal update", async () => {
    let setOutputsRef: any = null;

    function Tracker(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          setOutputsRef = setOutputs;
          setOutputs({ items: new Map([["x", 1]]) });
        },
      );
      return h(Fragment, {});
    }

    const mem = new InMemoryMemory();
    const result = render(
      () => h(Tracker, { key: "t" }, "t"),
      mem,
      "test-map-update",
    );

    await result.ready;
    await result.settled();

    // Update with a different Map (should NOT be silently dropped)
    setOutputsRef({ items: new Map([["x", 1], ["y", 2]]) });

    await result.settled();

    const nodes = result.getNodes();
    expect((nodes[0]!.outputs?.items as Map<string, number>).size).toBe(2);
    expect((nodes[0]!.outputs?.items as Map<string, number>).get("y")).toBe(2);

    result.dispose();
  });
});
