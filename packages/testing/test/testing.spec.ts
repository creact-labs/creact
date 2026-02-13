import { afterEach, describe, expect, it } from "vitest";
import {
  createRoot,
  createSignal,
  resetRuntime,
  useAsyncOutput,
} from "@creact-labs/creact";
import {
  renderTest,
  findNode,
  queryNodes,
  readOutput,
  waitFor,
  NoopMemory,
  InMemoryMemory,
} from "../src/index";

/** Helper: create a JSX element */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
}

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

describe("findNode()", () => {
  it("returns matching node", async () => {
    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ value: 42 });
      });
      return null;
    }

    const result = renderTest(() => h(Node, { key: "n" }, "n"));
    await result.ready;

    const node = findNode(result.getNodes(), (n) => n.id.includes("node"));
    expect(node).toBeDefined();

    result.dispose();
  });

  it("throws when no node matches", async () => {
    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
      });
      return null;
    }

    const result = renderTest(() => h(Node, { key: "n" }, "n"));
    await result.ready;

    expect(() =>
      findNode(result.getNodes(), (n) => n.id === "nonexistent"),
    ).toThrow("No node matching predicate");

    result.dispose();
  });
});

describe("queryNodes()", () => {
  it("returns all matching nodes", async () => {
    function NodeA(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
      });
      return null;
    }

    function NodeB(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
      });
      return null;
    }

    function Root() {
      return [h(NodeA, { key: "a" }, "a"), h(NodeB, { key: "b" }, "b")];
    }

    const result = renderTest(() => h(Root, {}, "root"));
    await result.ready;

    const nodes = queryNodes(result.getNodes(), () => true);
    expect(nodes.length).toBe(2);

    result.dispose();
  });

  it("returns empty array when nothing matches", async () => {
    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
      });
      return null;
    }

    const result = renderTest(() => h(Node, { key: "n" }, "n"));
    await result.ready;

    const nodes = queryNodes(
      result.getNodes(),
      (n) => n.id === "nonexistent",
    );
    expect(nodes.length).toBe(0);

    result.dispose();
  });
});

describe("readOutput()", () => {
  it("reads signal values from node", async () => {
    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ value: 42, name: "test" });
      });
      return null;
    }

    const result = renderTest(() => h(Node, { key: "n" }, "n"));
    await result.ready;

    const node = result.getNodes()[0]!;
    expect(readOutput(node, "value")).toBe(42);
    expect(readOutput(node, "name")).toBe("test");

    result.dispose();
  });

  it("returns undefined for missing output key", async () => {
    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
      });
      return null;
    }

    const result = renderTest(() => h(Node, { key: "n" }, "n"));
    await result.ready;

    const node = result.getNodes()[0]!;
    expect(readOutput(node, "nonexistent")).toBeUndefined();

    result.dispose();
  });
});

describe("waitFor()", () => {
  it("resolves when accessor becomes truthy", async () => {
    const [value, setValue] = createRoot(() => createSignal<string | null>(null));

    const promise = waitFor(value);

    // Set value after a tick
    queueMicrotask(() => setValue("hello"));

    const result = await promise;
    expect(result).toBe("hello");
  });

  it("resolves when predicate passes", async () => {
    const [count, setCount] = createRoot(() => createSignal(0));

    const promise = waitFor(count, (v) => v >= 3);

    // Increment over time
    queueMicrotask(() => setCount(1));
    queueMicrotask(() => setCount(2));
    queueMicrotask(() => setCount(3));

    const result = await promise;
    expect(result).toBe(3);
  });

  it("resolves immediately if accessor is already truthy", async () => {
    const [value] = createRoot(() => createSignal("already-set"));

    const result = await waitFor(value);
    expect(result).toBe("already-set");
  });
});
