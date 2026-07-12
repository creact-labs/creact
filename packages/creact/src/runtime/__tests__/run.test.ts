import { faker} from "@faker-js/faker";
import { afterEach, describe, expect, it, vi} from "vitest";
import { InMemoryMemory, delay, h } from "@creact-labs/testing";
import {
  For,
  Fragment,
  Show,
  createContext,
  createEffect,
  createSignal,
  createStore,
  useContext,
} from "../../index";
import { removeNodeFromRegistry, useAsyncOutput} from "../instance";
import type { Memory} from "../memory";
import { render, resetRuntime} from "../run";

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

  it("renews the lock lease before its TTL expires", async () => {
    const memory = new InMemoryMemory();
    const stackName = "renewed-stack";

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ran: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, stackName, {
      lockTtlSeconds: 1,
    });
    await result.ready;

    // Past the original 1s TTL the lease must still be held (renewed at
    // half-TTL intervals); without renewal the intruder would get in
    await delay(1300);
    expect(await memory.acquireLock(stackName, "intruder", 60)).toBe(false);

    result.dispose();
  });

  it("warns when the lock lease is lost during renewal", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const losing: Memory = {
      getState: async () => null,
      saveState: async () => {},
      acquireLock: async () => true,
      renewLock: async () => false,
      releaseLock: async () => {},
    };

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ran: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), losing, "lost-stack", {
      lockTtlSeconds: 0.1,
    });
    await result.ready;

    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Lost the deployment lock"),
      );
    });
    result.dispose();
  });

  it("warns when lock renewal itself fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const flaky: Memory = {
      getState: async () => null,
      saveState: async () => {},
      acquireLock: async () => true,
      renewLock: async () => {
        throw new Error("network down");
      },
      releaseLock: async () => {},
    };

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ran: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), flaky, "flaky-stack", {
      lockTtlSeconds: 0.1,
    });
    await result.ready;

    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to renew the deployment lock"),
        expect.any(Error),
      );
    });
    result.dispose();
  });

  it("disposing while the lock is being acquired hands it straight back", async () => {
    const memory = new InMemoryMemory();
    const releaseSpy = vi.spyOn(memory, "releaseLock");
    let resolveAcquire!: (acquired: boolean) => void;
    vi.spyOn(memory, "acquireLock").mockReturnValue(
      new Promise((resolve) => {
        resolveAcquire = resolve;
      }),
    );
    let executed = false;

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        executed = true;
        setOutputs({ ran: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, "raced-stack");
    result.dispose();
    resolveAcquire(true);
    await result.ready;

    // The dead runtime never deployed and returned the lock immediately
    expect(executed).toBe(false);
    expect(releaseSpy).toHaveBeenCalledWith("raced-stack");
  });

  it("disposing while previous state loads abandons the run before rendering", async () => {
    const memory = new InMemoryMemory();
    let releaseGetState!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGetState = resolve;
    });
    let gated = false;
    const realGetState = memory.getState.bind(memory);
    vi.spyOn(memory, "getState").mockImplementation(async (stackName) => {
      if (!gated) {
        gated = true;
        await gate;
      }
      return realGetState(stackName);
    });
    let executed = false;

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        executed = true;
        setOutputs({ ran: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, "mid-read-stack");
    await vi.waitFor(() => {
      expect(gated).toBe(true); // the lock is held, state read in flight
    });
    result.dispose();
    releaseGetState();
    await result.ready;

    // The dead runtime never rendered, and dispose returned the lock
    expect(executed).toBe(false);
    expect(await memory.acquireLock("mid-read-stack", "intruder", 60)).toBe(
      true,
    );
  });

  it("a dispose issued by a component during the initial render prevents deployment", async () => {
    const memory = new InMemoryMemory();
    let executed = false;
    let result!: ReturnType<typeof render>;

    function SelfDestruct() {
      // Components render inside the async run — the handle already exists
      result.dispose();
      useAsyncOutput({}, async (_p, setOutputs) => {
        executed = true;
        setOutputs({ ran: true });
      });
      return h(Fragment, {});
    }

    result = render(() => h(SelfDestruct, {}, "s"), memory, "self-destruct");
    await result.ready;

    expect(executed).toBe(false);
  });

  it("a failed initial run releases the lock without a manual dispose", async () => {
    const memory = new InMemoryMemory();
    const stackName = "failed-run-stack";
    vi.spyOn(console, "error").mockImplementation(() => {});

    function Doomed() {
      useAsyncOutput({}, async () => {
        throw new Error("boom");
      });
      return h(Fragment, {});
    }

    const result = render(() => h(Doomed, {}, "d"), memory, stackName);
    await expect(result.ready).rejects.toThrow("boom");

    // No manual dispose — the runtime already released its resources
    expect(await memory.acquireLock(stackName, "intruder", 60)).toBe(true);
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

describe("handler cleanup on re-run", () => {
  it("runs the previous cleanup before re-running the handler on a prop change", async () => {
    const memory = new InMemoryMemory();
    const [tag, setTag] = createSignal("first");
    const order: string[] = [];

    function Res() {
      useAsyncOutput(
        () => ({ tag: tag() }),
        async (p, setOutputs) => {
          order.push(`handler:${p.tag}`);
          setOutputs({ tag: p.tag });
          return () => {
            order.push(`cleanup:${p.tag}`);
          };
        },
      );
      return h(Fragment, {});
    }

    const result = render(() => h(Res, {}, "r"), memory, "cleanup-order");
    await result.ready;
    expect(order).toEqual(["handler:first"]);

    setTag("second");
    await result.settled();

    // The first run's subscriptions are torn down before the re-run —
    // otherwise every prop change would leak the previous side effects
    expect(order).toEqual(["handler:first", "cleanup:first", "handler:second"]);
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

  it("runtimes with identical component keys keep separate nodes and outputs", async () => {
    // Same component + key in both trees derives the same node id — with a
    // shared registry the second runtime would silently adopt the first
    // runtime's node
    const memoryA = new InMemoryMemory();
    const memoryB = new InMemoryMemory();
    const tagA = faker.string.uuid();
    const tagB = faker.string.uuid();

    function Tagged(props: { tag: string }) {
      useAsyncOutput({ tag: props.tag }, async (p, setOutputs) => {
        setOutputs({ tag: p.tag });
      });
      return h(Fragment, {});
    }

    const first = render(
      () => h(Tagged, { tag: tagA }, "shared"),
      memoryA,
      "stack-a",
    );
    const second = render(
      () => h(Tagged, { tag: tagB }, "shared"),
      memoryB,
      "stack-b",
    );
    await first.ready;
    await second.ready;

    expect(first.getNodes()).toHaveLength(1);
    expect(second.getNodes()).toHaveLength(1);
    expect(first.getNodes()[0]!.outputs).toEqual({ tag: tagA });
    expect(second.getNodes()[0]!.outputs).toEqual({ tag: tagB });

    await first.settled();
    await second.settled();
    expect((await memoryA.getState("stack-a"))!.nodes[0]!.outputs).toEqual({
      tag: tagA,
    });
    expect((await memoryB.getState("stack-b"))!.nodes[0]!.outputs).toEqual({
      tag: tagB,
    });

    first.dispose();
    second.dispose();
  });

  it("each runtime holds its own lock on its own stack", async () => {
    const memory = new InMemoryMemory();

    function Simple() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ok: true });
      });
      return h(Fragment, {});
    }

    const first = render(() => h(Simple, {}, "s"), memory, "stack-a");
    const second = render(() => h(Simple, {}, "s"), memory, "stack-b");
    await first.ready;
    await second.ready;

    // Both stacks are protected simultaneously, each by its own runtime
    expect(await memory.acquireLock("stack-a", "intruder", 60)).toBe(false);
    expect(await memory.acquireLock("stack-b", "intruder", 60)).toBe(false);

    // Releasing one lock (via dispose) leaves the other held
    first.dispose();
    expect(await memory.acquireLock("stack-a", "intruder", 60)).toBe(true);
    expect(await memory.acquireLock("stack-b", "intruder", 60)).toBe(false);

    second.dispose();
  });

  it("a reactive flush in one runtime is a no-op for every other runtime", async () => {
    const memoryA = new InMemoryMemory();
    const memoryB = new InMemoryMemory();
    const [gate, setGate] = createSignal(false);
    let executionsB = 0;

    function Gated() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ok: true });
      });
      return h(Fragment, {});
    }

    function AppA() {
      return Show({ when: gate, children: () => h(Gated, {}, "gated") });
    }

    function CountedB() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        executionsB++;
        setOutputs({ ok: true });
      });
      return h(Fragment, {});
    }

    const first = render(() => h(AppA, {}, "a"), memoryA, "stack-a");
    const second = render(() => h(CountedB, {}, "b"), memoryB, "stack-b");
    await first.ready;
    await second.ready;
    expect(executionsB).toBe(1);
    const nodesBefore = second.getNodes().map((n) => n.id);

    // Flush driven entirely by runtime A's tree
    setGate(true);
    await first.settled();
    await second.settled();

    expect(first.getNodes().map((n) => n.id)).toContain("gated-gated");
    expect(executionsB).toBe(1);
    expect(second.getNodes().map((n) => n.id)).toEqual(nodesBefore);

    first.dispose();
    second.dispose();
  });

  it("context providers in one runtime are invisible to the other", async () => {
    const memoryA = new InMemoryMemory();
    const memoryB = new InMemoryMemory();
    const Ctx = createContext<string>("default");
    const valueA = faker.string.uuid();
    const valueB = faker.string.uuid();
    const seen: Record<string, string> = {};

    function Reader(props: { slot: string }) {
      const value = useContext(Ctx);
      useAsyncOutput({ slot: props.slot }, async (p, setOutputs) => {
        seen[p.slot] = value;
        setOutputs({ value });
      });
      return h(Fragment, {});
    }

    function makeApp(value: string, slot: string) {
      return () =>
        Ctx.Provider({
          value,
          children: h(Reader, { slot }, slot),
        });
    }

    const first = render(makeApp(valueA, "a"), memoryA, "stack-a");
    const second = render(makeApp(valueB, "b"), memoryB, "stack-b");
    await first.ready;
    await second.ready;

    expect(seen).toEqual({ a: valueA, b: valueB });

    first.dispose();
    second.dispose();
  });

  it("stores with identical component paths persist to their own ledgers", async () => {
    const memoryA = new InMemoryMemory();
    const memoryB = new InMemoryMemory();
    const labelA = faker.lorem.word();
    const labelB = faker.lorem.word();

    function makeApp(label: string) {
      return function StoreApp() {
        const [state] = createStore({ label });
        useAsyncOutput({}, async (_p, setOutputs) => {
          setOutputs({ label: state.label });
        });
        return h(Fragment, {});
      };
    }

    const first = render(() => h(makeApp(labelA), {}, "s"), memoryA, "stack-a");
    const second = render(
      () => h(makeApp(labelB), {}, "s"),
      memoryB,
      "stack-b",
    );
    await first.ready;
    await second.ready;
    await first.settled();
    await second.settled();

    expect((await memoryA.getState("stack-a"))!.nodes[0]!.store).toEqual({
      label: labelA,
    });
    expect((await memoryB.getState("stack-b"))!.nodes[0]!.store).toEqual({
      label: labelB,
    });

    first.dispose();
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

  it("a rejected debounced save is reported, never an unhandled rejection", async () => {
    const memory = new InMemoryMemory();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let failSaves = false;
    const realSaveState = memory.saveState.bind(memory);
    vi.spyOn(memory, "saveState").mockImplementation(async (stack, state) => {
      if (failSaves) throw new Error("disk full");
      return realSaveState(stack, state);
    });
    let push: ((o: Record<string, any>) => void) | undefined;

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        push = setOutputs;
        setOutputs({ counter: 0 });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, "failing-save");
    await result.ready;
    await result.settled();

    failSaves = true;
    push!({ counter: 1 });

    // Let the debounce timer fire on its own — that path must absorb and
    // report the rejection
    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        "[CReact] Failed to save state:",
        expect.any(Error),
      );
    });
    // settled() still resolves — the failed save is not left in flight
    failSaves = false;
    await result.settled();
    result.dispose();
  });

  it("settled() waits for a debounced save already in flight", async () => {
    const memory = new InMemoryMemory();
    let gateSaves = false;
    let saveStarted = false;
    let releaseSave!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const realSaveState = memory.saveState.bind(memory);
    vi.spyOn(memory, "saveState").mockImplementation(async (stack, state) => {
      if (gateSaves) {
        saveStarted = true;
        await gate;
      }
      return realSaveState(stack, state);
    });
    let push: ((o: Record<string, any>) => void) | undefined;

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        push = setOutputs;
        setOutputs({ counter: 0 });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, "in-flight-save");
    await result.ready;
    await result.settled();

    gateSaves = true;
    push!({ counter: 1 });
    // Let the debounce timer fire so the save is genuinely in flight
    await vi.waitFor(() => {
      expect(saveStarted).toBe(true);
    });

    let settledResolved = false;
    const settling = result.settled().then(() => {
      settledResolved = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settledResolved).toBe(false); // still waiting on the save

    releaseSave();
    await settling;
    expect((await memory.getState("in-flight-save"))!.nodes[0]!.outputs).toEqual(
      { counter: 1 },
    );
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

afterEach(() => {
  resetRuntime();
  vi.restoreAllMocks();
});

describe("restart with persisted state", () => {
  it("handlers see their previous outputs through setOutputs(prev => ...)", async () => {
    const memory = new InMemoryMemory();
    const stackName = "restart-prev";
    const observedPrevs: Array<Record<string, any> | undefined> = [];

    function Counter() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs((prev) => {
          observedPrevs.push(prev);
          return { boots: (prev?.boots ?? 0) + 1 };
        });
      });
      return h(Fragment, {});
    }
    const app = () => h(Counter, {}, "app");

    const first = render(app, memory, stackName);
    await first.ready;
    first.dispose();
    resetRuntime();

    const second = render(app, memory, stackName);
    await second.ready;

    // First boot: no previous outputs. Second boot: state restored from Memory.
    expect(observedPrevs[0]?.boots).toBeUndefined();
    expect(observedPrevs[1]?.boots).toBe(1);
    expect((await memory.getState(stackName))?.nodes[0]?.outputs?.boots).toBe(
      2,
    );
    second.dispose();
  });

  it("hydrated outputs are readable through accessors before the handler re-runs", async () => {
    const memory = new InMemoryMemory();
    const stackName = "restart-accessor";
    let readUrl: (() => string | undefined) | undefined;

    function Db() {
      const out = useAsyncOutput<{ url: string }>({}, async (_p, setOutputs) => {
        setOutputs({ url: "http://live" });
      });
      readUrl = () => out.url();
      return h(Fragment, {});
    }
    const app = () => h(Db, {}, "db");

    const first = render(app, memory, stackName);
    await first.ready;
    first.dispose();
    resetRuntime();

    const second = render(app, memory, stackName);
    await second.ready;

    expect(readUrl!()).toBe("http://live");
    second.dispose();
  });
});

describe("props changing while a handler is in flight", () => {
  it("re-runs the handler after completion so it sees the fresh props", async () => {
    const memory = new InMemoryMemory();
    const [sharedVal, setSharedVal] = createSignal("initial");
    const consumerRuns: string[] = [];

    function QuickProducer() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        await delay(10);
        setSharedVal("updated");
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function SlowConsumer() {
      useAsyncOutput(
        () => ({ val: sharedVal() }),
        async (p: { val: string }, setOutputs) => {
          consumerRuns.push(p.val);
          await delay(50); // still running when the producer updates our props
          setOutputs({ saw: p.val });
        },
      );
      return h(Fragment, {});
    }

    function App() {
      return [h(QuickProducer, {}, "p"), h(SlowConsumer, {}, "c")];
    }

    const result = render(
      () => h(App, {}, "app"),
      memory,
      "dirty-while-running",
    );
    await result.ready;
    await result.settled();

    expect(consumerRuns).toEqual(["initial", "updated"]);
    result.dispose();
  });
});

describe("resources removed mid-deployment", () => {
  it("tears them down after the deployment finishes (deferred delete)", async () => {
    const memory = new InMemoryMemory();
    const [killed, setKilled] = createSignal(false);
    let doomedCleanedUp = false;

    function Doomed() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ alive: true });
        return () => {
          doomedCleanedUp = true;
        };
      });
      return h(Fragment, {});
    }

    function Killer() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        await delay(20); // let Doomed deploy first
        setKilled(true); // removes Doomed from the tree mid-deployment
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return [
        Show({ when: () => !killed(), children: () => h(Doomed, {}, "d") }),
        h(Killer, {}, "k"),
      ];
    }

    const result = render(
      () => h(App, {}, "app"),
      memory,
      "deferred-delete",
    );
    await result.ready;
    await result.settled();

    expect(doomedCleanedUp).toBe(true);
    expect(result.getNodes().map((n) => n.id)).toEqual(["killer-k"]);
    result.dispose();
  });
});

describe("signal writes racing the initial deployment", () => {
  it("changes made while applying are picked up right after (pending flush)", async () => {
    const memory = new InMemoryMemory();
    const [gate, setGate] = createSignal(false);
    let gatedDeployed = false;

    function Slow() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        await delay(30);
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function Gated() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        gatedDeployed = true;
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return [
        h(Slow, {}, "slow"),
        Show({ when: gate, children: () => h(Gated, {}, "gated") }),
      ];
    }

    const result = render(() => h(App, {}, "app"), memory, "race-initial");

    await delay(5); // initial deployment still applying
    setGate(true);

    await result.ready;
    await result.settled();

    expect(gatedDeployed).toBe(true);
    result.dispose();
  });
});

describe("getNodes", () => {
  it("falls back to the snapshot when the live node is gone from the registry", async () => {
    const memory = new InMemoryMemory();

    function Db() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return h(Db, {}, "solo");
    }

    const result = render(() => h(App, {}, "app"), memory, "nodes-fallback");
    await result.ready;

    removeNodeFromRegistry("db-solo");

    const nodes = result.getNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.id).toBe("db-solo");
    result.dispose();
  });
});

afterEach(() => {
  resetRuntime();
  vi.restoreAllMocks();
});

describe("infinite cascade backstop", () => {
  it("aborts a deployment whose handlers never stop re-triggering each other", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const memory = new InMemoryMemory();
    const [round, setRound] = createSignal(0);

    function PerpetualMotion() {
      useAsyncOutput(
        () => ({ round: round() }),
        async (_p, setOutputs) => {
          // every run changes this node's own props → endless re-queue
          setRound((r) => r + 1);
          setOutputs({ ok: true });
        },
      );
      return h(Fragment, {});
    }

    const result = render(
      () => h(PerpetualMotion, {}, "pm"),
      memory,
      "runaway-cascade",
      { maxHandlerExecutions: 5 },
    );

    await expect(result.ready).rejects.toThrow(/Max handler executions \(5\)/);
    expect((await memory.getState("runaway-cascade"))?.status).toBe("failed");
    result.dispose();
  });
});

describe("changes made by teardown during a deployment", () => {
  it("a deferred delete's cleanup can materialize new work (re-apply)", async () => {
    const memory = new InMemoryMemory();
    const [killed, setKilled] = createSignal(false);
    const [phoenixWanted, setPhoenixWanted] = createSignal(false);
    let phoenixDeployed = false;

    function Doomed() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ alive: true });
        // teardown runs after the executor drains — its signal write must
        // still be picked up by the same deployment's safety-net re-apply
        return () => {
          setPhoenixWanted(true);
        };
      });
      return h(Fragment, {});
    }

    function Killer() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        await delay(20); // let Doomed deploy first
        setKilled(true);
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function Phoenix() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        phoenixDeployed = true;
        setOutputs({ risen: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return [
        Show({ when: () => !killed(), children: () => h(Doomed, {}, "d") }),
        h(Killer, {}, "k"),
        Show({ when: phoenixWanted, children: () => h(Phoenix, {}, "p") }),
      ];
    }

    const result = render(
      () => h(App, {}, "app"),
      memory,
      "phoenix-from-cleanup",
    );
    await result.ready;
    await result.settled();

    expect(phoenixDeployed).toBe(true);
    result.dispose();
  });
});

describe("handlers throwing non-Error values", () => {
  it("the deployment fails and ready rejects with a real Error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const memory = new InMemoryMemory();

    function Rude() {
      useAsyncOutput({}, async () => {
        // intentionally a non-Error value — that's what this test verifies
        throw "string-failure";
      });
      return h(Fragment, {});
    }

    const result = render(() => h(Rude, {}, "r"), memory, "non-error-throw");

    await expect(result.ready).rejects.toThrow("string-failure");
    expect((await memory.getState("non-error-throw"))?.status).toBe("failed");
    result.dispose();
  });
});

describe("handlers that never set outputs", () => {
  it("deploy fine and persist without an outputs record", async () => {
    const memory = new InMemoryMemory();

    function Silent() {
      useAsyncOutput({}, async () => {
        // side-effect only — no setOutputs call
      });
      return h(Fragment, {});
    }

    const result = render(() => h(Silent, {}, "s"), memory, "no-outputs");
    await result.ready;

    expect(result.getNodes()[0]?.outputs).toBeUndefined();
    expect(
      (await memory.getState("no-outputs"))?.nodes[0]?.outputs,
    ).toBeUndefined();
    result.dispose();
  });
});

describe("dispose before the deployment starts", () => {
  it("a runtime disposed right after render() never deploys anything", async () => {
    const memory = new InMemoryMemory();
    let handlerRan = false;

    function App() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        handlerRan = true;
        setOutputs({ ok: true });
      });
      return h(Fragment, {});
    }

    const result = render(() => h(App, {}, "app"), memory, "instant-dispose");
    result.dispose(); // before run()'s first await resumes

    await result.ready;

    expect(handlerRan).toBe(false);
    expect(await memory.getState("instant-dispose")).toBeNull();
  });
});

describe("dispose during the initial deployment", () => {
  it("skips the queued work instead of deploying after teardown", async () => {
    const memory = new InMemoryMemory();
    const [gate, setGate] = createSignal(false);
    let gatedDeployed = false;

    function Slow() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        await delay(30);
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function Gated() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        gatedDeployed = true;
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return [
        h(Slow, {}, "slow"),
        Show({ when: gate, children: () => h(Gated, {}, "gated") }),
      ];
    }

    const result = render(() => h(App, {}, "app"), memory, "dispose-mid-run");

    await delay(5);
    setGate(true); // queues a flush while the deployment is applying
    result.dispose(); // teardown before the queued flush can run

    await result.ready; // initial run drains without deploying the flush
    await delay(20);

    expect(gatedDeployed).toBe(false);
  });
});

describe("degenerate roots", () => {
  it("rendering null deploys an empty stack", async () => {
    const memory = new InMemoryMemory();

    const result = render(() => null, memory, "null-root");
    await result.ready;

    expect(result.getNodes()).toEqual([]);
    expect((await memory.getState("null-root"))?.status).toBe("deployed");
    result.dispose();
  });
});

afterEach(() => {
  resetRuntime();
});

describe("settled()", () => {
  it("resolves immediately when no async handlers exist", async () => {
    function Empty() {
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(() => h(Empty, {}, "root"), memory, "test-settled");

    await result.ready;
    // settled() should resolve immediately — no pending work
    await result.settled();

    result.dispose();
  });

  it("resolves after all async handlers complete", async () => {
    const handlerOrder: string[] = [];

    function AsyncNode(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        await delay(50);
        handlerOrder.push("handler-done");
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(AsyncNode, { key: "a" }, "a"),
      memory,
      "test-settled-async",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder).toEqual(["handler-done"]);

    result.dispose();
  });

  it("waits for reactive cascades (handler A → setOutputs → Show materializes → handler B)", async () => {
    const handlerOrder: string[] = [];

    function Parent(props: { key: string }) {
      const out = useAsyncOutput<{ url: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("parent");
          setOutputs({ url: "http://example.com" });
        },
      );
      return Show({
        when: () => out.url(),
        children: (url: () => string) =>
          h(Child, { url: url(), key: "child" }, "child"),
      });
    }

    function Child(props: { url: string; key: string }) {
      useAsyncOutput(
        { url: props.url, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`child:${p.url}`);
          setOutputs({ connected: true });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Parent, { key: "p" }, "p"),
      memory,
      "test-settled-cascade",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder).toEqual(["parent", "child:http://example.com"]);

    result.dispose();
  });

  it("waits for debounced saveState to complete", async () => {
    let saveCalled = false;

    const memory = new InMemoryMemory();
    const origSave = memory.saveState.bind(memory);
    memory.saveState = async (stackName, state) => {
      saveCalled = true;
      return origSave(stackName, state);
    };

    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ value: 1 });
      });
      return h(Fragment, {});
    }

    const result = render(
      () => h(Node, { key: "n" }, "n"),
      memory,
      "test-settled-save",
    );

    await result.ready;
    await result.settled();

    // saveState should have been called (initial deployment + any debounced saves)
    expect(saveCalled).toBe(true);

    result.dispose();
  });

  it("multiple concurrent settled() calls all resolve", async () => {
    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        await delay(30);
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Node, { key: "n" }, "n"),
      memory,
      "test-settled-concurrent",
    );

    await result.ready;

    // Call settled() multiple times concurrently
    const [r1, r2, r3] = await Promise.all([
      result.settled(),
      result.settled(),
      result.settled(),
    ]);

    // All should resolve (void)
    expect(r1).toBeUndefined();
    expect(r2).toBeUndefined();
    expect(r3).toBeUndefined();

    result.dispose();
  });

  it("throws if runtime is disposed", async () => {
    function Empty() {
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Empty, {}, "root"),
      memory,
      "test-settled-disposed",
    );

    await result.ready;
    result.dispose();

    await expect(result.settled()).rejects.toThrow(
      "Cannot call settled() on disposed runtime",
    );
  });
});

afterEach(() => {
  resetRuntime();
});

describe("eager handler cascading", () => {
  it("handler A outputs → component B materializes → B's handler runs in same apply call", async () => {
    const handlerOrder: string[] = [];

    function Analysis(props: { key: string }) {
      const out = useAsyncOutput<{ summary: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Analysis");
          setOutputs({ summary: "analyzed-data" });
        },
      );
      // Use function children so summary is evaluated reactively when Show renders
      return Show({
        when: () => out.summary(),
        children: (summary: () => string) =>
          h(Connects, { summary: summary(), key: "c1" }, "c1"),
      });
    }

    function Connects(props: { summary: string; key: string }) {
      useAsyncOutput(
        { summary: props.summary, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Connects:${p.summary}`);
          setOutputs({ connected: true });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Analysis, { key: "a1" }, "a1"),
      memory,
      "test-eager-cascade",
    );

    await result.ready;

    // Both handlers should have run — Analysis first, then Connects
    expect(handlerOrder).toEqual(["Analysis", "Connects:analyzed-data"]);

    result.dispose();
  });

  it("two independent sibling handlers run concurrently", async () => {
    const timeline: { node: string; event: string; time: number }[] = [];
    const start = Date.now();

    function NodeA(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        timeline.push({ node: "A", event: "start", time: Date.now() - start });
        await delay(50);
        timeline.push({ node: "A", event: "end", time: Date.now() - start });
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function NodeB(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        timeline.push({ node: "B", event: "start", time: Date.now() - start });
        await delay(50);
        timeline.push({ node: "B", event: "end", time: Date.now() - start });
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function Root() {
      return [h(NodeA, { key: "a" }, "a"), h(NodeB, { key: "b" }, "b")];
    }

    const memory = new InMemoryMemory();
    const result = render(() => h(Root, {}, "root"), memory, "test-parallel");

    await result.ready;

    // Both should have started before either finished (concurrent execution)
    const aStart = timeline.find((t) => t.node === "A" && t.event === "start");
    const bStart = timeline.find((t) => t.node === "B" && t.event === "start");
    const aEnd = timeline.find((t) => t.node === "A" && t.event === "end");
    const bEnd = timeline.find((t) => t.node === "B" && t.event === "end");

    expect(aStart).toBeDefined();
    expect(bStart).toBeDefined();
    expect(aEnd).toBeDefined();
    expect(bEnd).toBeDefined();

    // B should start before A ends (parallel)
    expect(bStart!.time).toBeLessThan(aEnd!.time);

    result.dispose();
  });

  it("diamond dependency: A→B, A→C, B+C→D — correct ordering", async () => {
    const handlerOrder: string[] = [];

    // A is the root
    function A(props: { key: string }) {
      const out = useAsyncOutput<{ aVal: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("A");
          setOutputs({ aVal: "from-A" });
        },
      );
      return Show({
        when: () => out.aVal(),
        children: (aVal: () => string) => [
          h(B, { aVal: aVal(), key: "b" }, "b"),
          h(C, { aVal: aVal(), key: "c" }, "c"),
        ],
      });
    }

    // B depends on A
    function B(props: { aVal: string; key: string }) {
      const out = useAsyncOutput<{ bVal: string }>(
        { aVal: props.aVal, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push("B");
          setOutputs({ bVal: `B(${p.aVal})` });
        },
      );
      return Show({
        when: () => out.bVal(),
        children: (bVal: () => string) =>
          h(D, { bVal: bVal(), cVal: "pending", key: "d-from-b" }, "d-from-b"),
      });
    }

    // C depends on A
    function C(props: { aVal: string; key: string }) {
      useAsyncOutput(
        { aVal: props.aVal, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push("C");
          setOutputs({ cVal: `C(${p.aVal})` });
        },
      );
      return h(Fragment, {});
    }

    // D depends on B (materializes when B outputs)
    function D(props: { bVal: string; cVal: string; key: string }) {
      useAsyncOutput(
        { bVal: props.bVal, cVal: props.cVal, key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("D");
          setOutputs({ done: true });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(A, { key: "a" }, "a"),
      memory,
      "test-diamond",
    );

    await result.ready;

    // A must run first, then B and C (in any order), then D
    expect(handlerOrder[0]).toBe("A");
    expect(handlerOrder.slice(1, 3).sort()).toEqual(["B", "C"]);
    expect(handlerOrder).toContain("D");

    result.dispose();
  });

  it("error propagation: handler throws → dependents don't run, deployment fails", async () => {
    const handlerOrder: string[] = [];

    function Failing(props: { key: string }) {
      const out = useAsyncOutput<{ val: string }>(
        { key: props.key },
        async () => {
          handlerOrder.push("Failing");
          throw new Error("handler-error");
        },
      );
      return Show({
        when: () => out.val(),
        children: h(Dependent, { key: "dep" }, "dep"),
      });
    }

    function Dependent(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        handlerOrder.push("Dependent");
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Failing, { key: "f1" }, "f1"),
      memory,
      "test-error",
    );

    await expect(result.ready).rejects.toThrow("handler-error");

    // Only the failing handler should have run
    expect(handlerOrder).toEqual(["Failing"]);

    // Deployment should be marked as failed
    const state = await memory.getState("test-error");
    expect(state?.status).toBe("failed");

    result.dispose();
  });

  it("initial run with unchanged nodes re-executes handlers idempotently", async () => {
    let handlerCallCount = 0;

    function Idempotent(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        handlerCallCount++;
        setOutputs({ count: handlerCallCount });
      });
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();

    // First run
    const result1 = render(
      () => h(Idempotent, { key: "idem" }, "idem"),
      memory,
      "test-idempotent",
    );
    await result1.ready;
    expect(handlerCallCount).toBe(1);
    result1.dispose();
    resetRuntime();

    // Second run — handler should run again (idempotent re-execution)
    handlerCallCount = 0;
    const result2 = render(
      () => h(Idempotent, { key: "idem" }, "idem"),
      memory,
      "test-idempotent",
    );
    await result2.ready;
    expect(handlerCallCount).toBe(1);
    result2.dispose();
  });

  it("deep chain cascade resolves all levels", async () => {
    const handlerOrder: string[] = [];

    function Stage1(props: { key: string }) {
      const out = useAsyncOutput<{ s1: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("S1");
          setOutputs({ s1: "from-s1" });
        },
      );
      return Show({
        when: () => out.s1(),
        children: (s1: () => string) =>
          h(Stage2, { input: s1(), key: "s2" }, "s2"),
      });
    }

    function Stage2(props: { input: string; key: string }) {
      const out = useAsyncOutput<{ s2: string }>(
        { input: props.input, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`S2:${p.input}`);
          setOutputs({ s2: `s2(${p.input})` });
        },
      );
      return Show({
        when: () => out.s2(),
        children: (s2: () => string) =>
          h(Stage3, { input: s2(), key: "s3" }, "s3"),
      });
    }

    function Stage3(props: { input: string; key: string }) {
      const out = useAsyncOutput<{ s3: string }>(
        { input: props.input, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`S3:${p.input}`);
          setOutputs({ s3: `s3(${p.input})` });
        },
      );
      return Show({
        when: () => out.s3(),
        children: (s3: () => string) =>
          h(Stage4, { input: s3(), key: "s4" }, "s4"),
      });
    }

    function Stage4(props: { input: string; key: string }) {
      const out = useAsyncOutput<{ s4: string }>(
        { input: props.input, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`S4:${p.input}`);
          setOutputs({ s4: `s4(${p.input})` });
        },
      );
      return Show({
        when: () => out.s4(),
        children: (s4: () => string) =>
          h(Stage5, { input: s4(), key: "s5" }, "s5"),
      });
    }

    function Stage5(props: { input: string; key: string }) {
      useAsyncOutput(
        { input: props.input, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`S5:${p.input}`);
          setOutputs({ done: true });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Stage1, { key: "s1" }, "s1"),
      memory,
      "test-deep-chain",
    );

    await result.ready;

    expect(handlerOrder).toEqual([
      "S1",
      "S2:from-s1",
      "S3:s2(from-s1)",
      "S4:s3(s2(from-s1))",
      "S5:s4(s3(s2(from-s1)))",
    ]);

    result.dispose();
  });

  it("wide fan-out with secondary cascade", async () => {
    const handlerOrder: string[] = [];

    function Root(props: { key: string }) {
      const out = useAsyncOutput<{ ready: boolean }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Root");
          setOutputs({ ready: true });
        },
      );
      return Show({
        when: () => out.ready(),
        children: () => [
          h(BranchA, { key: "a" }, "a"),
          h(BranchB, { key: "b" }, "b"),
          h(BranchC, { key: "c" }, "c"),
        ],
      });
    }

    function BranchA(props: { key: string }) {
      const out = useAsyncOutput<{ aVal: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("A");
          setOutputs({ aVal: "done-a" });
        },
      );
      return Show({
        when: () => out.aVal(),
        children: (aVal: () => string) =>
          h(Leaf, { from: aVal(), key: "leaf-a" }, "leaf-a"),
      });
    }

    function BranchB(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("B");
          setOutputs({ bVal: "done-b" });
        },
      );
      return h(Fragment, {});
    }

    function BranchC(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("C");
          setOutputs({ cVal: "done-c" });
        },
      );
      return h(Fragment, {});
    }

    function Leaf(props: { from: string; key: string }) {
      useAsyncOutput(
        { from: props.from, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Leaf:${p.from}`);
          setOutputs({ processed: true });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Root, { key: "root" }, "root"),
      memory,
      "test-wide-cascade",
    );

    await result.ready;

    // Root runs first
    expect(handlerOrder[0]).toBe("Root");
    // Then A, B, C in some order
    expect(handlerOrder.filter((h) => ["A", "B", "C"].includes(h)).sort()).toEqual([
      "A",
      "B",
      "C",
    ]);
    // Leaf runs after A
    expect(handlerOrder).toContain("Leaf:done-a");
    const aIdx = handlerOrder.indexOf("A");
    const leafIdx = handlerOrder.indexOf("Leaf:done-a");
    expect(leafIdx).toBeGreaterThan(aIdx);

    result.dispose();
  });

  it("effect aggregates sibling outputs and gates a separate branch", async () => {
    const handlerOrder: string[] = [];

    // Shared state: parent creates signals, children write through effects
    const [allDone, setAllDone] = createSignal(false);
    const completedSet = new Set<string>();

    function Root() {
      return [
        // Branch 1: multiple workers
        h(Worker, { id: "w1", key: "w1" }, "w1"),
        h(Worker, { id: "w2", key: "w2" }, "w2"),
        h(Worker, { id: "w3", key: "w3" }, "w3"),
        // Branch 2: gated downstream (sibling of workers)
        Show({
          when: allDone,
          children: () => h(Downstream, { key: "ds" }, "ds"),
        }),
      ];
    }

    function Worker(props: { id: string; key: string }) {
      const out = useAsyncOutput<{ result: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push(`Worker:${props.id}`);
          setOutputs({ result: `done-${props.id}` });
        },
      );

      // Effect watches this worker's output and updates shared gate
      createEffect(() => {
        const r = out.result();
        if (r) {
          completedSet.add(props.id);
          if (completedSet.size === 3) {
            setAllDone(true);
          }
        }
      });

      return h(Fragment, {});
    }

    function Downstream(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Downstream");
          setOutputs({ final: true });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Root, {}, "root"),
      memory,
      "test-cross-branch",
    );

    await result.ready;
    await result.settled();

    // All workers should have run
    expect(
      handlerOrder.filter((h) => h.startsWith("Worker:")).length,
    ).toBe(3);
    // Downstream should have run after workers completed
    expect(handlerOrder).toContain("Downstream");

    result.dispose();
  });

  // ── Async handler tests (reproduce app patterns) ──────────────────

  it("async handler → setOutputs → For creates children → children handlers run", async () => {
    const handlerOrder: string[] = [];

    interface Item { id: string; name: string }

    function Parent(props: { key: string }) {
      const out = useAsyncOutput<{ items: Item[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Parent");
          await delay(10);
          setOutputs({ items: [
            { id: "a", name: "alpha" },
            { id: "b", name: "beta" },
            { id: "c", name: "gamma" },
          ]});
        },
      );

      return For({
        each: () => out.items() ?? [],
        keyFn: (item: Item) => item.id,
        children: (item) => h(Child, { item: item(), key: item().id }, item().id),
      });
    }

    function Child(props: { item: Item; key: string }) {
      useAsyncOutput(
        { item: props.item, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Child:${p.item.id}`);
          setOutputs({ processed: true });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Parent, { key: "parent" }, "parent"),
      memory,
      "test-async-for",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder[0]).toBe("Parent");
    expect(handlerOrder.filter(h => h.startsWith("Child:")).sort()).toEqual([
      "Child:a", "Child:b", "Child:c",
    ]);

    result.dispose();
  });

  it("async handler → For children → each child async → nested Show + handler", async () => {
    const handlerOrder: string[] = [];

    interface FileInfo { name: string; content: string }

    function FileTree(props: { key: string }) {
      const out = useAsyncOutput<{ files: FileInfo[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("FileTree");
          await delay(10);
          setOutputs({ files: [
            { name: "app.ts", content: "import foo" },
            { name: "utils.ts", content: "export bar" },
          ]});
        },
      );

      return For({
        each: () => out.files() ?? [],
        keyFn: (f: FileInfo) => f.name,
        children: (file) => h(FileAnalysis, { file: file(), key: file().name }, file().name),
      });
    }

    function FileAnalysis(props: { file: FileInfo; key: string }) {
      const out = useAsyncOutput<{ summary: string }>(
        { file: props.file, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Analysis:${p.file.name}`);
          await delay(5);
          setOutputs({ summary: `summary-of-${p.file.name}` });
        },
      );

      return Show({
        when: () => out.summary(),
        children: (summary: () => string) =>
          h(FileConnects, { summary: summary(), fileName: props.file.name, key: `conn-${props.key}` }, `conn-${props.key}`),
      });
    }

    function FileConnects(props: { summary: string; fileName: string; key: string }) {
      useAsyncOutput(
        { summary: props.summary, key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push(`Connects:${props.fileName}`);
          setOutputs({ deps: ["dep1"] });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(FileTree, { key: "tree" }, "tree"),
      memory,
      "test-async-deep-cascade",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder[0]).toBe("FileTree");
    expect(handlerOrder.filter(h => h.startsWith("Analysis:")).sort()).toEqual([
      "Analysis:app.ts", "Analysis:utils.ts",
    ]);
    expect(handlerOrder.filter(h => h.startsWith("Connects:")).sort()).toEqual([
      "Connects:app.ts", "Connects:utils.ts",
    ]);

    result.dispose();
  });

  it("async handlers → createEffect aggregates → gates sibling branch (anatomy pattern)", async () => {
    const handlerOrder: string[] = [];
    const [allAnalyzed, setAllAnalyzed] = createSignal(false);
    const analyzed = new Set<string>();
    const fileNames = ["a.ts", "b.ts", "c.ts"];

    function Root() {
      return [
        // Branch 1: file analysis (For with async children)
        ...fileNames.map(name =>
          h(FileWorker, { name, key: name }, name)
        ),
        // Branch 2: anatomy gate — only mounts when all files analyzed
        Show({
          when: allAnalyzed,
          children: () => h(Anatomy, { key: "anatomy" }, "anatomy"),
        }),
      ];
    }

    function FileWorker(props: { name: string; key: string }) {
      const out = useAsyncOutput<{ summary: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push(`Worker:${props.name}`);
          await delay(5);
          setOutputs({ summary: `done-${props.name}` });
        },
      );

      createEffect(() => {
        const s = out.summary();
        if (s) {
          analyzed.add(props.name);
          if (analyzed.size === fileNames.length) {
            setAllAnalyzed(true);
          }
        }
      });

      return h(Fragment, {});
    }

    function Anatomy(props: { key: string }) {
      useAsyncOutput(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Anatomy");
          await delay(5);
          setOutputs({ tissues: ["tissue-1"] });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Root, {}, "root"),
      memory,
      "test-async-gate-pattern",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder.filter(h => h.startsWith("Worker:")).length).toBe(3);
    expect(handlerOrder).toContain("Anatomy");

    result.dispose();
  });

  it("async handler → For → async children → createEffect gates For in sibling (full pipeline)", async () => {
    const handlerOrder: string[] = [];
    const [anatomyDone, setAnatomyDone] = createSignal(false);
    const analyzed = new Set<string>();

    interface Tissue { name: string; cells: string[] }

    function Pipeline(props: { key: string }) {
      const out = useAsyncOutput<{ files: string[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Discovery");
          await delay(5);
          setOutputs({ files: ["f1", "f2", "f3"] });
        },
      );

      return [
        // Stage 1: file analysis via For
        For({
          each: () => out.files() ?? [],
          keyFn: (f: string) => f,
          children: (file) => h(Analyzer, { file: file(), key: file() }, file()),
        }),
        // Stage 2: anatomy, gated on all files
        Show({
          when: anatomyDone,
          children: () => h(AnatomyStage, { key: "anatomy" }, "anatomy"),
        }),
      ];
    }

    function Analyzer(props: { file: string; key: string }) {
      const out = useAsyncOutput<{ summary: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push(`Analyze:${props.file}`);
          await delay(5);
          setOutputs({ summary: `s-${props.file}` });
        },
      );

      createEffect(() => {
        if (out.summary()) {
          analyzed.add(props.file);
          if (analyzed.size === 3) setAnatomyDone(true);
        }
      });

      return h(Fragment, {});
    }

    function AnatomyStage(props: { key: string }) {
      const out = useAsyncOutput<{ tissues: Tissue[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Anatomy");
          await delay(5);
          setOutputs({ tissues: [
            { name: "core", cells: ["f1", "f2"] },
            { name: "utils", cells: ["f3"] },
          ]});
        },
      );

      return For({
        each: () => out.tissues() ?? [],
        keyFn: (t: Tissue) => t.name,
        children: (tissue) => h(TissueWorker, {
          tissue: tissue(),
          key: tissue().name,
        }, tissue().name),
      });
    }

    function TissueWorker(props: { tissue: Tissue; key: string }) {
      useAsyncOutput(
        { tissue: props.tissue, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Tissue:${p.tissue.name}`);
          await delay(5);
          setOutputs({ organs: [`organ-${p.tissue.name}`] });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Pipeline, { key: "pipeline" }, "pipeline"),
      memory,
      "test-full-pipeline",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder[0]).toBe("Discovery");
    expect(handlerOrder.filter(h => h.startsWith("Analyze:")).length).toBe(3);
    expect(handlerOrder).toContain("Anatomy");
    expect(handlerOrder.filter(h => h.startsWith("Tissue:")).sort()).toEqual([
      "Tissue:core", "Tissue:utils",
    ]);

    result.dispose();
  });

  it("microtask-resolved async handlers → For → cascading children (mock-like timing)", async () => {
    // This test simulates the timing of mocked async responses —
    // promises that resolve on the microtask queue rather than setTimeout.
    // This is closer to how vitest mocks resolve in test suites.
    const handlerOrder: string[] = [];
    const tick = () => new Promise<void>(r => queueMicrotask(r));

    interface Item { id: string }

    function Parent(props: { key: string }) {
      const out = useAsyncOutput<{ items: Item[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("Parent");
          await tick(); // microtask, not setTimeout
          setOutputs({ items: [{ id: "x" }, { id: "y" }, { id: "z" }] });
        },
      );

      return For({
        each: () => out.items() ?? [],
        keyFn: (item: Item) => item.id,
        children: (item) => h(Child, { item: item(), key: item().id }, item().id),
      });
    }

    function Child(props: { item: Item; key: string }) {
      useAsyncOutput(
        { item: props.item, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Child:${p.item.id}`);
          await tick();
          setOutputs({ done: true });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Parent, { key: "p" }, "p"),
      memory,
      "test-microtask-for",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder[0]).toBe("Parent");
    expect(handlerOrder.filter(h => h.startsWith("Child:")).sort()).toEqual([
      "Child:x", "Child:y", "Child:z",
    ]);

    result.dispose();
  });

  it("zero-delay async handlers with concurrent setOutputs (race condition probe)", async () => {
    // Multiple handlers resolve on the same microtask and call setOutputs
    // nearly simultaneously. Tests whether concurrent signal writes
    // cause fiber tree corruption during collectInstanceNodes.
    const handlerOrder: string[] = [];
    const [gateOpen, setGateOpen] = createSignal(false);
    const completed = new Set<string>();

    function Root() {
      return [
        h(Worker, { id: "w1", key: "w1" }, "w1"),
        h(Worker, { id: "w2", key: "w2" }, "w2"),
        h(Worker, { id: "w3", key: "w3" }, "w3"),
        h(Worker, { id: "w4", key: "w4" }, "w4"),
        h(Worker, { id: "w5", key: "w5" }, "w5"),
        Show({
          when: gateOpen,
          children: () => h(ForConsumer, { key: "fc" }, "fc"),
        }),
      ];
    }

    function Worker(props: { id: string; key: string }) {
      const out = useAsyncOutput<{ result: string }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push(`Worker:${props.id}`);
          // All resolve on same microtask
          await Promise.resolve();
          setOutputs({ result: `done-${props.id}` });
        },
      );

      createEffect(() => {
        if (out.result()) {
          completed.add(props.id);
          if (completed.size === 5) setGateOpen(true);
        }
      });

      return h(Fragment, {});
    }

    function ForConsumer(props: { key: string }) {
      const out = useAsyncOutput<{ items: string[] }>(
        { key: props.key },
        async (_p, setOutputs) => {
          handlerOrder.push("ForConsumer");
          await Promise.resolve();
          setOutputs({ items: ["i1", "i2", "i3"] });
        },
      );

      return For({
        each: () => out.items() ?? [],
        keyFn: (i: string) => i,
        children: (item) => h(Leaf, { item: item(), key: item() }, item()),
      });
    }

    function Leaf(props: { item: string; key: string }) {
      useAsyncOutput(
        { item: props.item, key: props.key },
        async (p, setOutputs) => {
          handlerOrder.push(`Leaf:${p.item}`);
          setOutputs({ processed: true });
        },
      );
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();
    const result = render(
      () => h(Root, {}, "root"),
      memory,
      "test-race-condition",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder.filter(h => h.startsWith("Worker:")).length).toBe(5);
    expect(handlerOrder).toContain("ForConsumer");
    expect(handlerOrder.filter(h => h.startsWith("Leaf:")).sort()).toEqual([
      "Leaf:i1", "Leaf:i2", "Leaf:i3",
    ]);

    result.dispose();
  });

  it("deployment state tracks multiple applying nodes", async () => {
    let savedStates: string[][] = [];

    const trackingMemory: Memory = {
      ...new InMemoryMemory(),
      _inner: new InMemoryMemory(),
      async getState(stackName: string) {
        return (this as any)._inner.getState(stackName);
      },
      async saveState(stackName: string, state: any) {
        if (state.applyingNodeIds && state.applyingNodeIds.length > 0) {
          savedStates.push([...state.applyingNodeIds]);
        }
        return (this as any)._inner.saveState(stackName, state);
      },
    } as any;

    function NodeA(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        await delay(20);
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function NodeB(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        await delay(20);
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    function Root() {
      return [h(NodeA, { key: "a" }, "a"), h(NodeB, { key: "b" }, "b")];
    }

    const result = render(
      () => h(Root, {}, "root"),
      trackingMemory,
      "test-multi-apply",
    );

    await result.ready;

    // At some point, both nodes should have been in the applying set simultaneously
    const hadMultiple = savedStates.some((ids) => ids.length >= 2);
    expect(hadMultiple).toBe(true);

    result.dispose();
  });
});

afterEach(() => {
  resetRuntime();
});

describe("resetRuntime()", () => {
  it("calls cleanup functions on all registered nodes", async () => {
    const cleanupCalls: string[] = [];

    function NodeA(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
        return () => {
          cleanupCalls.push("A");
        };
      });
      return h(Fragment, {});
    }

    function NodeB(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
        return () => {
          cleanupCalls.push("B");
        };
      });
      return h(Fragment, {});
    }

    function Root() {
      return [h(NodeA, { key: "a" }, "a"), h(NodeB, { key: "b" }, "b")];
    }

    const memory = new InMemoryMemory();
    const result = render(() => h(Root, {}, "root"), memory, "test-reset");
    await result.ready;

    expect(cleanupCalls).toEqual([]);

    resetRuntime();

    // Both cleanup functions should have been called
    expect(cleanupCalls).toContain("A");
    expect(cleanupCalls).toContain("B");
    expect(cleanupCalls.length).toBe(2);
  });

  it("cancels debounced saveState timers (no late saves after reset)", async () => {
    const memory = new InMemoryMemory();
    let saveCountAfterReset = 0;

    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ value: 1 });
      });
      return h(Fragment, {});
    }

    const result = render(
      () => h(Node, { key: "n" }, "n"),
      memory,
      "test-reset-timers",
    );
    await result.ready;

    // Reset runtime (should cancel any debounced saves)
    resetRuntime();

    // Track saves after reset
    const origSave = memory.saveState.bind(memory);
    memory.saveState = async (stackName, state) => {
      saveCountAfterReset++;
      return origSave(stackName, state);
    };

    // Wait longer than debounce period (100ms)
    await new Promise((r) => setTimeout(r, 200));

    // No saves should have fired after reset
    expect(saveCountAfterReset).toBe(0);
  });

  it("clears nodeOwnership — no 'Duplicate resource ID' errors on re-render", async () => {
    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        setOutputs({ done: true });
      });
      return h(Fragment, {});
    }

    const memory = new InMemoryMemory();

    // First render
    const result1 = render(
      () => h(Node, { key: "n" }, "n"),
      memory,
      "test-reset-ownership",
    );
    await result1.ready;

    // Reset
    resetRuntime();

    // Second render with same node IDs should not throw
    const memory2 = new InMemoryMemory();
    const result2 = render(
      () => h(Node, { key: "n" }, "n"),
      memory2,
      "test-reset-ownership",
    );
    await result2.ready;

    // Should work fine
    expect(result2.getNodes().length).toBe(1);

    result2.dispose();
  });

  it("after resetRuntime(), a fresh render() works cleanly", async () => {
    const handlerCalls: string[] = [];

    function Node(props: { key: string }) {
      useAsyncOutput({ key: props.key }, async (_p, setOutputs) => {
        handlerCalls.push("handler");
        setOutputs({ value: 42 });
      });
      return h(Fragment, {});
    }

    // First render
    const memory1 = new InMemoryMemory();
    const result1 = render(
      () => h(Node, { key: "n" }, "n"),
      memory1,
      "test-fresh",
    );
    await result1.ready;
    expect(handlerCalls).toEqual(["handler"]);

    // Reset everything
    resetRuntime();

    // Second render should work cleanly
    const memory2 = new InMemoryMemory();
    handlerCalls.length = 0;

    const result2 = render(
      () => h(Node, { key: "n" }, "n"),
      memory2,
      "test-fresh",
    );
    await result2.ready;

    expect(handlerCalls).toEqual(["handler"]);
    expect(result2.getNodes().length).toBe(1);

    result2.dispose();
  });
});
