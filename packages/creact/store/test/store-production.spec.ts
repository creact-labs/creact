import { afterEach, describe, expect, it, vi } from "vitest";

// The store's dev guards are decided at module load from NODE_ENV, so these
// tests load a fresh copy of the module with NODE_ENV=production.
async function loadProductionStore() {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  return await import("../src/store");
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
