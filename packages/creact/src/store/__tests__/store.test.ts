import { faker} from "@faker-js/faker";
import { afterEach, describe, expect, it, vi} from "vitest";
import { InMemoryMemory, h } from "@creact-labs/testing";
import { Fragment, createStore} from "../../index";
import { createEffect} from "../../reactive/effect";
import { createRoot} from "../../reactive/owner";
import { createMemo} from "../../reactive/signal";
import { useAsyncOutput} from "../../runtime/instance";
import { render, resetRuntime} from "../../runtime/run";
import { clearHydration, hydrateStore, prepareHydration, unwrap} from "../store";

function generateUser() {
  return {
    name: faker.person.fullName(),
    age: faker.number.int({ min: 18, max: 90 }),
  };
}

afterEach(() => {
  clearHydration();
});

describe("createStore", () => {
  it("exposes the initial values through the proxy", () => {
    const user = generateUser();

    const [state] = createStore({ user, tags: ["a", "b"] });

    expect(state.user.name).toBe(user.name);
    expect(state.user.age).toBe(user.age);
    expect(state.tags[0]).toBe("a");
  });

  it("does not share state with the object passed in (deep copy)", () => {
    const initial = { user: generateUser() };

    const [state, setState] = createStore(initial);
    setState("user", "name", "changed");

    expect(initial.user.name).not.toBe("changed");
    expect(state.user.name).toBe("changed");
  });

  it("updating a top-level value re-runs effects that read it", () => {
    const seen: number[] = [];
    let setCount!: (key: "count", value: number) => void;
    createRoot(() => {
      const [state, setState] = createStore({ count: 1 });
      setCount = setState;
      createEffect(() => {
        seen.push(state.count);
      });
    });

    setCount("count", 2);

    expect(seen).toEqual([1, 2]);
  });

  it("updating a nested value only notifies readers of that value", () => {
    const user = generateUser();
    const names: string[] = [];
    let themeReads = 0;
    let update!: (k1: "user", k2: "name", value: string) => void;
    createRoot(() => {
      const [state, setState] = createStore({ user, theme: "dark" });
      update = setState;
      createEffect(() => {
        names.push(state.user.name);
      });
      createEffect(() => {
        state.theme;
        themeReads++;
      });
    });

    update("user", "name", "Updated");

    expect(names).toEqual([user.name, "Updated"]);
    expect(themeReads).toBe(1); // theme effect untouched
  });

  it("supports functional updates that receive the previous value", () => {
    createRoot(() => {
      const start = faker.number.int({ min: 0, max: 100 });
      const [state, setState] = createStore({ count: start });

      setState("count", (prev: number) => prev + 1);

      expect(state.count).toBe(start + 1);
    });
  });

  it("setting the same value does not re-run effects", () => {
    let runs = 0;
    let setCount!: (key: "count", value: number) => void;
    createRoot(() => {
      const [state, setState] = createStore({ count: 5 });
      setCount = setState;
      createEffect(() => {
        state.count;
        runs++;
      });
    });

    setCount("count", 5);

    expect(runs).toBe(1);
  });

  it("replacing a nested object updates effects reading through it", () => {
    const names: string[] = [];
    const replacement = generateUser();
    let doReplace!: () => void;
    let readAge!: () => number;
    createRoot(() => {
      const [state, setState] = createStore({ user: generateUser() });
      doReplace = () => setState("user", replacement);
      readAge = () => state.user.age;
      createEffect(() => {
        names.push(state.user.name);
      });
    });

    doReplace();

    expect(names[names.length - 1]).toBe(replacement.name);
    expect(readAge()).toBe(replacement.age);
  });

  it("returns the same child proxy for repeated reads", () => {
    const [state] = createStore({ user: generateUser() });

    expect(state.user).toBe(state.user);
  });

  it("direct mutation throws and points to setStore", () => {
    const [state] = createStore({ count: 1 }) as [any, any];

    expect(() => {
      state.count = 2;
    }).toThrow(/Use setStore/);
  });

  it("deleting a property directly throws", () => {
    const [state] = createStore({ count: 1 }) as [any, any];

    expect(() => {
      delete state.count;
    }).toThrow(/Cannot delete store property directly/);
  });

  it("ignores setStore calls with fewer than two arguments", () => {
    const [state, setState] = createStore({ count: 1 });

    (setState as any)("count");

    expect(state.count).toBe(1);
  });

  it("ignores nested setStore paths through missing intermediates", () => {
    const [state, setState] = createStore({ user: generateUser() }) as [
      any,
      any,
    ];

    setState("missing", "name", "x");

    expect(state.missing).toBeUndefined();
  });

  it("re-wrapping the same nested object reuses its cached proxy", () => {
    const shared = { name: "shared" };
    const [state, setState] = createStore({ user: { name: "first" } }) as [
      any,
      any,
    ];

    setState("user", shared);
    const firstProxy = state.user;
    setState("user", { name: "other" });
    setState("user", shared); // same raw object again → proxy cache hit

    expect(state.user).toBe(firstProxy);
  });

  it("reading the same property twice in one effect subscribes once", () => {
    let runs = 0;
    let bump!: () => void;
    createRoot(() => {
      const [state, setState] = createStore({ count: 0 });
      bump = () => setState("count", (prev: number) => prev + 1);
      createEffect(() => {
        state.count;
        state.count; // second read must not double-subscribe
        runs++;
      });
    });

    bump();

    expect(runs).toBe(2); // initial + exactly one re-run
  });

  it("memos over store properties propagate to their observers", () => {
    const seen: number[] = [];
    let bump!: () => void;
    createRoot(() => {
      const [state, setState] = createStore({ count: 1 });
      bump = () => setState("count", (prev: number) => prev + 1);
      const doubled = createMemo(() => state.count * 2);
      createEffect(() => {
        seen.push(doubled());
      });
    });

    bump();

    expect(seen).toEqual([2, 4]);
  });

  it("symbol and constructor reads pass through without tracking", () => {
    const [state] = createStore({ count: 1 }) as [any, any];
    const sym = Symbol("probe");

    expect(state[sym]).toBeUndefined();
    expect(state.constructor).toBe(Object);
  });
});

describe("unwrap", () => {
  it("returns plain data equal to the store contents", () => {
    const user = generateUser();
    const [state] = createStore({ user });

    const raw = unwrap(state);

    expect(raw).toEqual({ user });
  });

  it("mutating the unwrapped copy does not affect the store", () => {
    const [state] = createStore({ user: generateUser() });

    const raw = unwrap(state) as any;
    raw.user.name = "mutated";

    expect(state.user.name).not.toBe("mutated");
  });

  it.each([
    { label: "a number", value: 42 },
    { label: "a string", value: "plain" },
    { label: "null", value: null },
    { label: "a non-store object", value: { a: 1 } },
  ])("passes $label through unchanged", ({ value }) => {
    expect(unwrap(value)).toEqual(value);
  });
});

describe("store hydration from Memory", () => {
  it("restores a store snapshot for a component path", () => {
    const stored = { count: faker.number.int() };
    prepareHydration([
      { path: ["app", "db", "instance"], store: stored },
    ]);

    const hydrated = hydrateStore<{ count: number }>(["app", "db"]);

    expect(hydrated).toEqual(stored);
  });

  it("walks nested node children when collecting snapshots", () => {
    const childStore = { flag: true };
    prepareHydration([
      {
        path: ["app", "node"],
        store: undefined,
        children: [{ path: ["app", "child", "instance"], store: childStore }],
      },
    ]);

    expect(hydrateStore(["app", "child"])).toEqual(childStore);
  });

  it("returns undefined when there is nothing stored for the path", () => {
    prepareHydration([]);

    expect(hydrateStore(["nowhere"])).toBeUndefined();
    expect(hydrateStore(undefined)).toBeUndefined();
  });

  it("returns a copy so later mutations cannot corrupt the snapshot", () => {
    const stored = { items: ["a"] };
    prepareHydration([{ path: ["app", "x"], store: stored }]);

    const first = hydrateStore<{ items: string[] }>(["app"]) as any;
    first.items.push("b");

    expect(hydrateStore<{ items: string[] }>(["app"])).toEqual({
      items: ["a"],
    });
  });

  it("clearHydration drops all snapshots", () => {
    prepareHydration([{ path: ["app", "x"], store: { a: 1 } }]);

    clearHydration();

    expect(hydrateStore(["app"])).toBeUndefined();
  });
});

// The store's dev guards are decided at module load from NODE_ENV, so these
// tests load a fresh copy of the module with NODE_ENV=production.
async function loadProductionStore() {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  return await import("../store");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("store in production mode", () => {
  it("direct property assignment mutates instead of throwing", async () => {
    const { createStore } = await loadProductionStore();
    const [state] = createStore({ count: 1 }) as [any, any];

    state.count = 2;

    expect(state.count).toBe(2);
  });

  it("assigning the same value is a no-op", async () => {
    const { createStore } = await loadProductionStore();
    const [state] = createStore({ count: 3 }) as [any, any];

    state.count = 3;

    expect(state.count).toBe(3);
  });

  it("assigning an object drops the cached child proxy", async () => {
    const { createStore } = await loadProductionStore();
    const [state] = createStore({ user: { name: "before" } }) as [any, any];
    state.user; // populate the child proxy cache

    state.user = { name: "after" };

    expect(state.user.name).toBe("after");
  });

  it("deleting a property removes it", async () => {
    const { createStore } = await loadProductionStore();
    const [state] = createStore({ count: 1, extra: "x" }) as [any, any];

    delete state.extra;

    expect("extra" in state).toBe(false);
  });

  it("deleting a missing property is harmless", async () => {
    const { createStore } = await loadProductionStore();
    const [state] = createStore({ count: 1 }) as [any, any];

    expect(() => {
      delete state.never;
    }).not.toThrow();
  });
});

afterEach(() => {
  resetRuntime();
});

describe("createStore persistence through Memory", () => {
  it("a component's store survives a restart", async () => {
    const memory = new InMemoryMemory();
    const stackName = "store-restart";
    const bootCounts: number[] = [];

    function Worker() {
      // createStore before useAsyncOutput so persistence keys line up
      const [state, setState] = createStore({ boots: 0 });
      useAsyncOutput({}, async (_p, setOutputs) => {
        setState("boots", state.boots + 1);
        bootCounts.push(state.boots);
        setOutputs({ ok: true });
      });
      return h(Fragment, {});
    }
    const app = () => h(Worker, {}, "w");

    const first = render(app, memory, stackName);
    await first.ready;
    await first.settled();
    first.dispose();
    resetRuntime();

    const second = render(app, memory, stackName);
    await second.ready;
    await second.settled();
    second.dispose();

    // First boot started fresh; second boot restored the persisted store
    expect(bootCounts).toEqual([1, 2]);
  });

  it("the store snapshot is persisted alongside the component's resource", async () => {
    const memory = new InMemoryMemory();
    const stackName = "store-snapshot";

    function Worker() {
      const [state, setState] = createStore({ progress: 0 });
      useAsyncOutput({}, async (_p, setOutputs) => {
        setState("progress", 42);
        state.progress;
        setOutputs({ ok: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(Worker, {}, "w"), memory, stackName);
    await result.ready;
    await result.settled();
    result.dispose();

    const persisted = await memory.getState(stackName);
    expect(persisted?.nodes[0]?.store).toEqual({ progress: 42 });
  });

  it("stores created outside components behave exactly as before", () => {
    const [state, setState] = createStore({ value: "plain" });

    setState("value", "still-plain");

    expect(state.value).toBe("still-plain");
  });
});
