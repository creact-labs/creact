import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal, Fragment, Show } from "../../src/index";
import { InMemoryMemory } from "../../test/helpers/setup";
import { removeNodeFromRegistry, useAsyncOutput } from "../src/instance";
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
