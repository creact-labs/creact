import { afterEach, describe, expect, it, vi} from "vitest";
import { InMemoryMemory, h } from "@creact-labs/testing";
import { Fragment, Show, createSignal} from "../../index";
import { callAllCleanupFunctions, getAllNodes, getNodeById, removeNodeFromRegistry, shallowEqual, useAsyncOutput} from "../instance";
import type { Memory} from "../memory";
import { render, resetRuntime} from "../run";
import { allContexts} from "../runtime-context";

/** The runtime context a registered node lives in (for scoped removal) */
const contextHolding = (nodeId: string) =>
  [...allContexts].find((ctx) => ctx.nodeRegistry.has(nodeId))!;

const bareMemory = (): Memory => ({
  getState: async () => null,
  saveState: async () => {},
});

afterEach(() => {
  resetRuntime();
  vi.restoreAllMocks();
});

describe("useAsyncOutput developer errors", () => {
  it("throws when called outside of a render pass", () => {
    expect(() => useAsyncOutput({}, async () => {})).toThrow(
      /must be called during render/,
    );
  });

  it("rejects a second call inside the same component", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    function DoubleTrouble() {
      useAsyncOutput({}, async () => {});
      useAsyncOutput({}, async () => {});
      return h(Fragment, {});
    }

    const result = render(
      () => h(DoubleTrouble, {}, "dt"),
      new InMemoryMemory(),
      "double-hook",
    );

    await expect(result.ready).rejects.toThrow(/once per component/);
    result.dispose();
  });

  it("requires a key on components that manage resources", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    function KeylessResource() {
      useAsyncOutput({}, async () => {});
      return h(Fragment, {});
    }

    function App() {
      // note: no key on the child
      return h(KeylessResource, {});
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "keyless",
    );

    await expect(result.ready).rejects.toThrow(/has no key/);
    result.dispose();
  });

  it("rejects two sibling resources that resolve to the same id", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    function Db() {
      useAsyncOutput({}, async () => {});
      return h(Fragment, {});
    }

    function App() {
      return [h(Db, {}, "same"), h(Db, {}, "same")];
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "dup-id",
    );

    await expect(result.ready).rejects.toThrow(/Duplicate resource ID/);
    result.dispose();
  });

  it("still catches a duplicate revealed after an earlier node set outputs", async () => {
    // Regression: setOutputs used to clear the whole ownership map, so a
    // duplicate mounted later in the deployment slipped past detection
    vi.spyOn(console, "error").mockImplementation(() => {});
    const [gate, setGate] = createSignal(false);

    function Db() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        // Wipes ownership in the buggy version
        setOutputs({ up: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return [
        h(Db, {}, "same"),
        Show({ when: gate, children: () => h(Db, {}, "same") }),
      ];
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "late-dup-id",
    );
    await result.ready;

    // Mounting the second claimant from a different fiber path must throw
    expect(() => setGate(true)).toThrow(/Duplicate resource ID/);
    result.dispose();
  });
});

describe("cleanup functions returning promises", () => {
  it("absorbs async cleanup rejections instead of crashing the process", async () => {
    const memory = new InMemoryMemory();

    function Flaky() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
        return async () => {
          throw new Error("teardown failed");
        };
      });
      return h(Fragment, {});
    }

    const result = render(() => h(Flaky, {}, "f"), memory, "async-cleanup");
    await result.ready;

    // The sweep starts the async cleanup; its rejection must be absorbed
    // (an unhandled rejection would fail this test run)
    expect(() => callAllCleanupFunctions()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));

    result.dispose();
  });

  it("dispose absorbs async cleanup rejections from current nodes", async () => {
    const memory = new InMemoryMemory();

    function Flaky() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
        return async () => {
          throw new Error("teardown failed");
        };
      });
      return h(Fragment, {});
    }

    const result = render(() => h(Flaky, {}, "f"), memory, "async-dispose");
    await result.ready;

    expect(() => result.dispose()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe("resource identity", () => {
  it("derives kebab-case ids from the component name and key", async () => {
    function MyDatabaseCluster() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
      });
      return h(Fragment, {});
    }

    // wrapped in a root — render() overrides the root element's key with the stack name
    function App() {
      return h(MyDatabaseCluster, {}, "primary");
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "kebab",
    );
    await result.ready;

    expect(result.getNodes()[0]?.id).toBe("my-database-cluster-primary");
    result.dispose();
  });
});

describe("setOutputs", () => {
  it("functional updates receive the previously set outputs", async () => {
    let observed: number | undefined;

    function Counter() {
      const out = useAsyncOutput<{ count: number }>(
        {},
        async (_p, setOutputs) => {
          setOutputs({ count: 1 });
          setOutputs((prev) => ({ count: (prev?.count ?? 0) + 1 }));
        },
      );
      observed = undefined;
      const read = () => (observed = out.count());
      // read after ready via accessor below
      (Counter as any).read = read;
      return h(Fragment, {});
    }

    const result = render(
      () => h(Counter, {}, "c"),
      new InMemoryMemory(),
      "functional-outputs",
    );
    await result.ready;

    (Counter as any).read();
    expect(observed).toBe(2);
    result.dispose();
  });

  it("skips signal writes when values are shallow-equal", async () => {
    let push: ((o: Record<string, any>) => void) | undefined;

    function Stable() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        push = setOutputs;
        setOutputs({ list: [1, 2, 3] });
      });
      return h(Fragment, {});
    }

    const result = render(
      () => h(Stable, {}, "s"),
      new InMemoryMemory(),
      "stable-outputs",
    );
    await result.ready;
    const node = getNodeById(result.getNodes()[0]!.id)!;
    const before = node.outputs;

    push!({ list: [1, 2, 3] }); // same shape — must be ignored

    expect(getNodeById(node.id)!.outputs).toBe(before);
    result.dispose();
  });

  it("output accessors transparently invoke function values", async () => {
    let readCompute: (() => any) | undefined;

    function Lazy() {
      const out = useAsyncOutput<{ compute: () => string }>(
        {},
        async (_p, setOutputs) => {
          setOutputs({ compute: () => "computed-value" });
        },
      );
      readCompute = () => out.compute();
      return h(Fragment, {});
    }

    // bare memory: function outputs are not structured-cloneable
    const result = render(() => h(Lazy, {}, "l"), bareMemory(), "fn-outputs");
    await result.ready;

    expect(readCompute!()).toBe("computed-value");
    result.dispose();
  });
});

describe("node registry maintenance", () => {
  it("getAllNodes lists every registered resource", async () => {
    function Db() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return [h(Db, {}, "one"), h(Db, {}, "two")];
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "registry-list",
    );
    await result.ready;

    expect(getAllNodes().map((n) => n.id).sort()).toEqual([
      "db-one",
      "db-two",
    ]);
    result.dispose();
  });

  it("removeNodeFromRegistry forgets the node and disarms its cleanup", async () => {
    let cleanups = 0;

    function Db() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
        return () => {
          cleanups++;
        };
      });
      return h(Fragment, {});
    }

    function App() {
      return h(Db, {}, "gone");
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "registry-remove",
    );
    await result.ready;

    // Removal is scoped to one runtime's context — name it explicitly
    removeNodeFromRegistry("db-gone", contextHolding("db-gone"));

    expect(getNodeById("db-gone")).toBeUndefined();
    callAllCleanupFunctions();
    expect(cleanups).toBe(0);
    result.dispose();
  });

  it("removeNodeFromRegistry tolerates unknown ids", () => {
    expect(() => removeNodeFromRegistry("never-existed")).not.toThrow();
  });

  it("cleanup sweeps survive a cleanup function that throws", async () => {
    let secondCleanupRan = false;

    function Fragile() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
        return () => {
          throw new Error("teardown exploded");
        };
      });
      return h(Fragment, {});
    }

    function Healthy() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
        return () => {
          secondCleanupRan = true;
        };
      });
      return h(Fragment, {});
    }

    function App() {
      return [h(Fragile, {}, "f"), h(Healthy, {}, "h")];
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "fragile-cleanup",
    );
    await result.ready;
    // Detach the runtime's own sweep so callAllCleanupFunctions is exercised
    expect(() => callAllCleanupFunctions()).not.toThrow();
    expect(secondCleanupRan).toBe(true);
    result.dispose();
  });
});

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
        async (p: { dep: string | undefined }, setOutputs) => {
          // the runtime defers the handler until dep is defined
          runs.push(p.dep!);
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

describe("shallowEqual", () => {
  // Reference equality
  it("returns true for same reference", () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  // Null/undefined
  it("returns false for null vs object", () => {
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual({}, null)).toBe(false);
  });

  it("returns true for null vs null", () => {
    expect(shallowEqual(null, null)).toBe(true);
  });

  it("returns false for undefined vs object", () => {
    expect(shallowEqual(undefined, {})).toBe(false);
  });

  // Primitives
  it("returns false for different primitives", () => {
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual("a", "b")).toBe(false);
  });

  it("returns true for same primitives", () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual("a", "a")).toBe(true);
  });

  // Plain objects
  it("returns true for objects with same keys and values", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it("returns false for objects with different values", () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("returns false for objects with different keys", () => {
    expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it("returns false for different keys even when both values are undefined", () => {
    expect(shallowEqual({ a: undefined }, { b: undefined })).toBe(false);
  });

  it("returns false for objects with different key count", () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  // Arrays
  it("returns true for arrays with same elements", () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("returns true for empty arrays", () => {
    expect(shallowEqual([], [])).toBe(true);
  });

  it("returns false for arrays with different length", () => {
    expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("returns false for arrays with different elements", () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it("returns false for array vs non-array", () => {
    expect(shallowEqual([1], { 0: 1 })).toBe(false);
  });

  // Maps
  it("returns true for Maps with same entries", () => {
    expect(shallowEqual(
      new Map([["a", 1], ["b", 2]]),
      new Map([["a", 1], ["b", 2]]),
    )).toBe(true);
  });

  it("returns true for empty Maps", () => {
    expect(shallowEqual(new Map(), new Map())).toBe(true);
  });

  it("returns false for Maps with different size", () => {
    expect(shallowEqual(
      new Map([["a", 1]]),
      new Map([["a", 1], ["b", 2]]),
    )).toBe(false);
  });

  it("returns false for Maps with different values", () => {
    expect(shallowEqual(
      new Map([["a", 1]]),
      new Map([["a", 2]]),
    )).toBe(false);
  });

  it("returns false for Maps with different keys", () => {
    expect(shallowEqual(
      new Map([["a", 1]]),
      new Map([["b", 1]]),
    )).toBe(false);
  });

  it("returns false for Map vs plain object", () => {
    expect(shallowEqual(new Map([["a", 1]]), { a: 1 })).toBe(false);
  });

  // Sets
  it("returns true for Sets with same members", () => {
    expect(shallowEqual(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true);
  });

  it("returns true for empty Sets", () => {
    expect(shallowEqual(new Set(), new Set())).toBe(true);
  });

  it("returns false for Sets with different size", () => {
    expect(shallowEqual(new Set([1]), new Set([1, 2]))).toBe(false);
  });

  it("returns false for Sets with different members", () => {
    expect(shallowEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
  });

  it("returns false for Set vs Array", () => {
    expect(shallowEqual(new Set([1, 2]), [1, 2])).toBe(false);
  });

  // Cross-type
  it("returns false for Map vs Set", () => {
    expect(shallowEqual(new Map(), new Set())).toBe(false);
  });
});

afterEach(() => {
  resetRuntime();
});

describe("prop reactivity — signal changes trigger handler re-runs", () => {
  it("signal change triggers handler re-run", async () => {
    let handlerCount = 0;
    const [count, setCount] = createSignal(1);

    function Counter(props: { key: string }) {
      useAsyncOutput(
        () => ({ count: count(), key: props.key }),
        async (p, setOutputs) => {
          handlerCount++;
          setOutputs({ seen: p.count });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Counter, { key: "c1" }, "c1"),
      memory,
      "test-prop-rerun",
    );
    await result.ready;
    expect(handlerCount).toBe(1);

    // Update the signal — should trigger a handler re-run
    setCount(2);
    await result.settled();

    expect(handlerCount).toBe(2);

    result.dispose();
  });

  it("handler receives updated props on re-run", async () => {
    const receivedProps: number[] = [];
    const [count, setCount] = createSignal(10);

    function Tracker(props: { key: string }) {
      useAsyncOutput(
        () => ({ count: count(), key: props.key }),
        async (p, setOutputs) => {
          receivedProps.push(p.count);
          setOutputs({ last: p.count });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Tracker, { key: "t1" }, "t1"),
      memory,
      "test-prop-values",
    );
    await result.ready;
    expect(receivedProps).toEqual([10]);

    setCount(20);
    await result.settled();
    expect(receivedProps).toEqual([10, 20]);

    setCount(30);
    await result.settled();
    expect(receivedProps).toEqual([10, 20, 30]);

    result.dispose();
  });

  it("output signals update after prop-triggered re-run", async () => {
    const [count, setCount] = createSignal(1);
    let outputAccessors: any;

    function Doubler(props: { key: string }) {
      outputAccessors = useAsyncOutput<{ doubled: number }>(
        () => ({ count: count(), key: props.key }),
        async (p, setOutputs) => {
          setOutputs({ doubled: p.count * 2 });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Doubler, { key: "d1" }, "d1"),
      memory,
      "test-prop-outputs",
    );
    await result.ready;
    expect(outputAccessors.doubled()).toBe(2);

    setCount(5);
    await result.settled();
    expect(outputAccessors.doubled()).toBe(10);

    result.dispose();
  });

  it("no re-run when signal value doesn't change", async () => {
    let handlerCount = 0;
    const [count, setCount] = createSignal(42);

    function Stable(props: { key: string }) {
      useAsyncOutput(
        () => ({ count: count(), key: props.key }),
        async (p, setOutputs) => {
          handlerCount++;
          setOutputs({ v: p.count });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Stable, { key: "s1" }, "s1"),
      memory,
      "test-prop-noop",
    );
    await result.ready;
    expect(handlerCount).toBe(1);

    // Set to the same value — should NOT trigger re-run
    setCount(42);
    await result.settled();
    expect(handlerCount).toBe(1);

    result.dispose();
  });

  it("cascading prop change: A outputs → B getter reads output → B re-runs", async () => {
    const handlerOrder: string[] = [];
    const [trigger, setTrigger] = createSignal("initial");

    function Producer(props: { key: string }) {
      const out = useAsyncOutput<{ data: string }>(
        () => ({ trigger: trigger(), key: props.key }),
        async (p, setOutputs) => {
          handlerOrder.push(`Producer:${p.trigger}`);
          setOutputs({ data: `produced-${p.trigger}` });
        },
      );
      // Consumer reads Producer's output via a reactive getter
      return Show({
        when: () => out.data(),
        children: (data: () => string) =>
          h(Consumer, { getData: data, key: "consumer" }, "consumer"),
      });
    }

    // Consumer uses a getter to reactively track Producer's output
    function Consumer(props: { getData: () => string; key: string }) {
      useAsyncOutput(
        () => ({ input: props.getData(), key: props.key }),
        async (p, setOutputs) => {
          handlerOrder.push(`Consumer:${p.input}`);
          setOutputs({ processed: true });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Producer, { key: "p1" }, "p1"),
      memory,
      "test-prop-cascade",
    );
    await result.ready;

    // Initial run: Producer then Consumer
    expect(handlerOrder).toEqual([
      "Producer:initial",
      "Consumer:produced-initial",
    ]);

    // Change the trigger signal — Producer re-runs, outputs change,
    // Consumer's getter sees new value → re-runs
    setTrigger("updated");
    await result.settled();

    expect(handlerOrder).toContain("Producer:updated");
    expect(handlerOrder).toContain("Consumer:produced-updated");

    result.dispose();
  });
});
