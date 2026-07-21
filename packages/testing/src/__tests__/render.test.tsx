import { afterEach, describe, expect, test } from "vitest";
import { resetRuntime, useAsyncOutput } from "@creact-labs/creact";
import { InMemoryMemory, NoopMemory, render } from "../index";

afterEach(() => resetRuntime());

function Counter(props: { start?: number }) {
  useAsyncOutput<{ count: number }>({}, async (_p, set) =>
    set({ count: props.start ?? 0 }),
  );
  return <></>;
}

function Item() {
  useAsyncOutput({}, async (_p, set) => set({ v: 1 }));
  return <></>;
}

function Tree() {
  return (
    <>
      <Counter testId="the-counter" key="counter" start={5} />
      <Item key="a" />
      <Item key="b" />
    </>
  );
}

describe("render() queries", () => {
  test("getByType finds the one node and reads its output", async () => {
    const view = render(() => <Tree />);
    await view.ready;

    expect(view.getByType(Counter).output("count")).toBe(5);
    expect(view.getByType(Counter).outputs()).toEqual({ count: 5 });
    view.dispose();
  });

  test("getByKey / getByTestId cross-reference the same node", async () => {
    const view = render(() => <Tree />);
    await view.ready;

    expect(view.getByKey("counter").testId).toBe("the-counter");
    expect(view.getByTestId("the-counter").key).toBe("counter");
    view.dispose();
  });

  test("nodes() exposes every deployed node", async () => {
    const view = render(() => <Tree />);
    await view.ready;

    expect(view.nodes()).toHaveLength(3);
    view.dispose();
  });

  test("getAllByType returns every match; getByType throws when >1", async () => {
    const view = render(() => <Tree />);
    await view.ready;

    expect(view.getAllByType(Item)).toHaveLength(2);
    expect(() => view.getByType(Item)).toThrow(/Multiple/);
    expect(() => view.queryByType(Item)).toThrow(/Multiple/);
    view.dispose();
  });

  test("query* returns null for no match; get*/getAll* throw", async () => {
    const view = render(() => <Tree />);
    await view.ready;

    const Absent = () => <></>;
    expect(view.queryByKey("nope")).toBeNull();
    expect(view.queryByTestId("nope")).toBeNull();
    expect(view.queryByType(Absent)).toBeNull();
    expect(view.queryByType(Counter)).not.toBeNull();
    expect(() => view.getByKey("nope")).toThrow(/No node found/);
    expect(() => view.getByTestId("nope")).toThrow(/No node found/);
    expect(() => view.getAllByType(Absent)).toThrow(/No node found/);
    // type labels: a non-function type and an anonymous function
    expect(() => view.getByType("nope")).toThrow(/type nope/);
    expect(() => view.getByType(function () {})).toThrow(/anonymous/);
    view.dispose();
  });

  test("findByKey / findByTestId / findByType wait for a node to appear", async () => {
    const view = render(() => <Tree />);
    await view.ready;

    expect((await view.findByKey("a")).key).toBe("a");
    expect((await view.findByTestId("the-counter")).testId).toBe("the-counter");
    expect((await view.findByType(Counter)).output("count")).toBe(5);
    view.dispose();
  });

  test("view.waitFor resolves once the callback is truthy", async () => {
    const view = render(() => <Tree />);
    await view.ready;

    const counter = view.getByType(Counter);
    await expect(
      view.waitFor(() => counter.output("count") === 5),
    ).resolves.toBe(true);
    await expect(
      view.waitFor(() => false, { timeout: 20, interval: 5 }),
    ).rejects.toThrow();
    view.dispose();
  });
});

describe("render() options", () => {
  test("persists to a supplied memory backend", async () => {
    const memory = new InMemoryMemory();
    const view = render(() => <Counter key="c" start={1} />, {
      memory,
      id: "persisted",
    });
    await view.ready;

    expect(await memory.getState("persisted")).not.toBeNull();
    view.dispose();
  });

  test("defaults to a no-op backend that saves nothing", async () => {
    const memory = new NoopMemory();
    const view = render(() => <Counter key="c" />);
    await view.ready;

    expect(await memory.getState()).toBeNull();
    view.dispose();
  });
});
