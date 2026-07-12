import { faker } from "@faker-js/faker";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal, Fragment, Show } from "../../src/index";
import { InMemoryMemory } from "../../test/helpers/setup";
import { useAsyncOutput } from "../src/instance";
import type { Memory } from "../src/memory";
import { render, resetRuntime } from "../src/run";

/** Helper: create a JSX element */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  resetRuntime();
  vi.restoreAllMocks();
});

describe("deployment locking", () => {
  it("refuses to deploy a stack that is locked by someone else", async () => {
    const memory = new InMemoryMemory();
    const stackName = "locked-stack";
    await memory.acquireLock(stackName, "another-deployment", 300);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ran: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, stackName);

    await expect(result.ready).rejects.toThrow(/is locked/);
    expect(errorSpy).toHaveBeenCalled();
    result.dispose();
  });

  it("releases the lock on dispose so the next deployment can proceed", async () => {
    const memory = new InMemoryMemory();
    const stackName = "handover-stack";

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ran: true });
      });
      return h(Fragment, {});
    }

    const first = render(() => h(App, {}, "app"), memory, stackName);
    await first.ready;

    // While the first runtime is alive the stack is protected
    expect(await memory.acquireLock(stackName, "intruder", 60)).toBe(false);

    first.dispose();
    resetRuntime();

    const second = render(() => h(App, {}, "app"), memory, stackName);
    await expect(second.ready).resolves.toBeUndefined();
    second.dispose();
  });

  it("deploys normally when the backend has no locking support", async () => {
    const states = new Map<string, any>();
    const bare: Memory = {
      getState: async (s) => states.get(s) ?? null,
      saveState: async (s, state) => {
        states.set(s, state);
      },
    };

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ran: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), bare, "bare-stack");

    await expect(result.ready).resolves.toBeUndefined();
    result.dispose();
  });
});

describe("interrupted deployment recovery", () => {
  it("announces in-flight nodes from a crashed deployment before re-running them", async () => {
    const memory = new InMemoryMemory();
    const stackName = "crashed-stack";
    await memory.saveState(stackName, {
      nodes: [],
      status: "applying",
      applyingNodeIds: ["app.ghost-node"],
      stackName,
      lastDeployedAt: Date.now(),
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ran: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, stackName);
    await result.ready;

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Resuming interrupted deployment"),
      expect.stringContaining("1 node(s)"),
      ["app.ghost-node"],
    );
    result.dispose();
  });
});

describe("settled()", () => {
  it("can be awaited before ready without hanging the event loop", async () => {
    // Regression: a microtask spin here starved setTimeout and hung forever
    const memory = new InMemoryMemory();
    let handlerFinished = false;

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        await delay(20);
        handlerFinished = true;
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, "settle-early");

    // Deliberately NOT awaiting ready first
    await result.settled();

    expect(handlerFinished).toBe(true);
    result.dispose();
  }, 5000);

  it("rejects when called on a disposed runtime", async () => {
    const memory = new InMemoryMemory();
    function App() {
      return h(Fragment, {});
    }
    const result = render(() => h(App, {}, "app"), memory, "settle-disposed");
    await result.ready;

    result.dispose();

    await expect(result.settled()).rejects.toThrow(/disposed/);
  });
});

describe("resource deletion", () => {
  it("runs a removed resource's cleanup exactly once, even across resetRuntime", async () => {
    // Regression: deleted nodes stayed in the registry with cleanupFn set,
    // so a later sweep called the same cleanup a second time
    const memory = new InMemoryMemory();
    const [visible, setVisible] = createSignal(true);
    let cleanupCalls = 0;

    function Ephemeral() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
        return () => {
          cleanupCalls++;
        };
      });
      return h(Fragment, {});
    }

    function App() {
      return Show({
        when: visible,
        children: () => h(Ephemeral, {}, "eph"),
      });
    }

    const result = render(() => h(App, {}, "app"), memory, "delete-once");
    await result.ready;
    await result.settled();

    setVisible(false);
    await result.settled();
    expect(cleanupCalls).toBe(1);

    result.dispose();
    resetRuntime(); // sweeps the registry — must not re-run the cleanup

    expect(cleanupCalls).toBe(1);
  });

  it("a resource that returns after deletion redeploys from scratch", async () => {
    const memory = new InMemoryMemory();
    const [visible, setVisible] = createSignal(true);
    let deploys = 0;

    function Toggle() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        deploys++;
        setOutputs({ generation: deploys });
      });
      return h(Fragment, {});
    }

    function App() {
      return Show({
        when: visible,
        children: () => h(Toggle, {}, "toggle"),
      });
    }

    const result = render(() => h(App, {}, "app"), memory, "delete-return");
    await result.ready;
    await result.settled();
    expect(deploys).toBe(1);

    setVisible(false);
    await result.settled();
    setVisible(true);
    await result.settled();

    expect(deploys).toBe(2);
    result.dispose();
  });
});

describe("mid-deployment prop updates", () => {
  it("re-runs an already-deployed sibling whose props changed during the deployment", async () => {
    // Regression: cascade updates to deployed nodes were silently dropped
    const memory = new InMemoryMemory();
    const [sharedVal, setSharedVal] = createSignal("initial");
    const handlerRuns: string[] = [];

    function SlowProducer() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        handlerRuns.push("producer");
        await delay(30);
        setSharedVal("from-producer");
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function FastConsumer() {
      useAsyncOutput(
        () => ({ val: sharedVal() }),
        async (p: { val: string }, setOutputs) => {
          handlerRuns.push(`consumer:${p.val}`);
          setOutputs({ saw: p.val });
        },
      );
      return h(Fragment, {});
    }

    function App() {
      return [
        h(SlowProducer, {}, "producer"),
        h(FastConsumer, {}, "consumer"),
      ];
    }

    const result = render(() => h(App, {}, "app"), memory, "cascade-update");
    await result.ready;
    await result.settled();

    expect(handlerRuns).toContain("consumer:initial");
    expect(handlerRuns).toContain("consumer:from-producer");
    expect(handlerRuns.indexOf("consumer:from-producer")).toBeGreaterThan(
      handlerRuns.indexOf("consumer:initial"),
    );
    result.dispose();
  });
});

describe("multiple concurrent runtimes", () => {
  it("disposing one runtime does not break reactivity of another", async () => {
    // Regression: dispose() cleared the single global flush callback,
    // killing reactive updates for every other live runtime
    const memoryA = new InMemoryMemory();
    const memoryB = new InMemoryMemory();
    const [gate, setGate] = createSignal(false);
    let gatedDeployed = false;

    function Simple() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ok: true });
      });
      return h(Fragment, {});
    }

    function Gated() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        gatedDeployed = true;
        setOutputs({ ok: true });
      });
      return h(Fragment, {});
    }

    function AppB() {
      return Show({ when: gate, children: () => h(Gated, {}, "gated") });
    }

    const first = render(() => h(Simple, {}, "s"), memoryA, "stack-a");
    const second = render(() => h(AppB, {}, "b"), memoryB, "stack-b");
    await first.ready;
    await second.ready;

    first.dispose();

    setGate(true);
    await second.settled();

    expect(gatedDeployed).toBe(true);
    second.dispose();
  });
});

describe("state persistence", () => {
  it("output-only changes after deployment are saved (debounced)", async () => {
    const memory = new InMemoryMemory();
    const stackName = "output-save";
    let push: ((o: Record<string, any>) => void) | undefined;

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        push = setOutputs;
        setOutputs({ counter: 0 });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, stackName);
    await result.ready;
    await result.settled();

    push!({ counter: 41 });
    await result.settled(); // forces the debounced save

    const state = await memory.getState(stackName);
    expect(state?.status).toBe("deployed");
    expect(state?.nodes[0]?.outputs?.counter).toBe(41);
    result.dispose();
  });

  it("getNodes exposes live outputs merged onto node snapshots", async () => {
    const memory = new InMemoryMemory();
    let push: ((o: Record<string, any>) => void) | undefined;

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        push = setOutputs;
        setOutputs({ phase: "boot" });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, "live-nodes");
    await result.ready;

    push!({ phase: "running" });

    const nodes = result.getNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.outputs?.phase).toBe("running");
    result.dispose();
  });
});

describe("reactive flush failures", () => {
  it("logs and marks the deployment failed instead of crashing the process", async () => {
    const memory = new InMemoryMemory();
    const stackName = "flush-fail";
    const [gate, setGate] = createSignal(false);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function Exploding() {
      useAsyncOutput({}, async () => {
        throw new Error(faker.hacker.phrase());
      });
      return h(Fragment, {});
    }

    function App() {
      return Show({ when: gate, children: () => h(Exploding, {}, "boom") });
    }

    const result = render(() => h(App, {}, "app"), memory, stackName);
    await result.ready;

    setGate(true);
    await result.settled();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error applying changes after reactive flush"),
      expect.any(Error),
    );
    expect((await memory.getState(stackName))?.status).toBe("failed");
    result.dispose();
  });
});

describe("dispose", () => {
  it("tears down resources exactly once and tolerates a second dispose", async () => {
    const memory = new InMemoryMemory();
    let cleanups = 0;

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
        return () => {
          cleanups++;
        };
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, "dispose-once");
    await result.ready;

    result.dispose();
    result.dispose();
    resetRuntime();

    expect(cleanups).toBe(1);
  });
});
