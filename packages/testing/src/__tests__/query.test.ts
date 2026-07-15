import { afterEach, describe, expect, it } from "vitest";
import {
  resetRuntime,
  useAsyncOutput,
} from "@creact-labs/creact";
import {
  h,
  renderTest,
  findNode,
  queryNodes,
  readOutput,
} from "../index";

afterEach(() => {
  resetRuntime();
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
