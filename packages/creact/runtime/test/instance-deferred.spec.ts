import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal, Fragment } from "../../src/index";
import { InMemoryMemory } from "../../test/helpers/setup";
import { getNodeById, useAsyncOutput } from "../src/instance";
import { render, resetRuntime } from "../src/run";

/** Helper: create a JSX element */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
}

afterEach(() => {
  resetRuntime();
  vi.restoreAllMocks();
});

describe("deferred resources (undefined dependencies)", () => {
  it("static undefined props never materialize a resource", async () => {
    const memory = new InMemoryMemory();
    let handlerRan = false;

    function NeverReady() {
      useAsyncOutput({ dep: undefined }, async () => {
        handlerRan = true;
      });
      return h(Fragment, {});
    }

    function App() {
      return h(NeverReady, {}, "nr");
    }

    const result = render(() => h(App, {}, "app"), memory, "static-deferred");
    await result.ready;

    expect(handlerRan).toBe(false);
    expect(result.getNodes()).toEqual([]);
    result.dispose();
  });

  it("a resource waits for its reactive dependency and deploys once it resolves", async () => {
    const memory = new InMemoryMemory();
    const [dep, setDep] = createSignal<string | undefined>(undefined);
    const runs: string[] = [];

    function Waiting() {
      useAsyncOutput(
        () => ({ dep: dep() }),
        async (p: { dep: string }, setOutputs) => {
          runs.push(p.dep);
          setOutputs({ ok: true });
        },
      );
      return h(Fragment, {});
    }

    function App() {
      return h(Waiting, {}, "w");
    }

    const result = render(() => h(App, {}, "app"), memory, "getter-deferred");
    await result.ready;
    expect(runs).toEqual([]); // dep still undefined — placeholder only

    setDep("resolved");
    await result.settled();

    expect(runs).toEqual(["resolved"]);
    expect(result.getNodes()).toHaveLength(1);
    result.dispose();
  });
});

describe("setOutputs change detection for collection values", () => {
  async function setupNode() {
    const memory = new InMemoryMemory();
    let push: ((o: Record<string, any>) => void) | undefined;

    function Db() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        push = setOutputs;
        setOutputs({ ready: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return h(Db, {}, "coll");
    }

    const result = render(() => h(App, {}, "app"), memory, "collections");
    await result.ready;
    return { result, push: push! };
  }

  it.each([
    {
      label: "an equivalent Map is ignored",
      first: () => new Map([["k", "v"]]),
      second: () => new Map([["k", "v"]]),
      changed: false,
    },
    {
      label: "a Map with a changed value triggers an update",
      first: () => new Map([["k", "v"]]),
      second: () => new Map([["k", "other"]]),
      changed: true,
    },
    {
      label: "a Map with a different size triggers an update",
      first: () => new Map([["k", "v"]]),
      second: () => new Map(),
      changed: true,
    },
    {
      label: "an equivalent Set is ignored",
      first: () => new Set(["a", "b"]),
      second: () => new Set(["a", "b"]),
      changed: false,
    },
    {
      label: "a Set with different members triggers an update",
      first: () => new Set(["a"]),
      second: () => new Set(["z"]),
      changed: true,
    },
    {
      label: "an equivalent array is ignored",
      first: () => [1, 2, 3],
      second: () => [1, 2, 3],
      changed: false,
    },
    {
      label: "an array with a changed item triggers an update",
      first: () => [1, 2, 3],
      second: () => [1, 2, 4],
      changed: true,
    },
    {
      label: "an array replaced by an object triggers an update",
      first: () => [1],
      second: () => ({ 0: 1 }),
      changed: true,
    },
    {
      label: "an object with different keys triggers an update",
      first: () => ({ a: 1 }),
      second: () => ({ b: 1 }),
      changed: true,
    },
  ])("$label", async ({ first, second, changed }) => {
    const { result, push } = await setupNode();
    const node = getNodeById("db-coll")!;

    push({ value: first() });
    const before = node.outputs;
    push({ value: second() });

    if (changed) {
      expect(node.outputs).not.toBe(before);
    } else {
      expect(node.outputs).toBe(before);
    }
    result.dispose();
  });
});
