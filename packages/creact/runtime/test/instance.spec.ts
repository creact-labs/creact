import { afterEach, describe, expect, it, vi } from "vitest";
import { Fragment } from "../../src/index";
import { InMemoryMemory } from "../../test/helpers/setup";
import {
  callAllCleanupFunctions,
  getAllNodes,
  getNodeById,
  removeNodeFromRegistry,
  useAsyncOutput,
} from "../src/instance";
import type { Memory } from "../src/memory";
import { render, resetRuntime } from "../src/run";

/** Helper: create a JSX element */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
}

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

    removeNodeFromRegistry("db-gone");

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
