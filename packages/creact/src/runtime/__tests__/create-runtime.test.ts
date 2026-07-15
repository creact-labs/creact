import { faker } from "@faker-js/faker";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemoryMemory, h } from "@creact-labs/testing";
import {
  Fragment,
  Show,
  createContext,
  createSignal,
  useContext,
} from "../../index";
import { createRuntime } from "../create-runtime";
import { useAsyncOutput } from "../instance";
import { renderFiber } from "../render";
import { render, resetRuntime } from "../run";

afterEach(() => {
  resetRuntime();
  vi.restoreAllMocks();
});

/** render() stamps the root element's key with the stack name — fragment
 * roots keep the wrapper elements' own keys intact */
const asRoot = (element: unknown) => h(Fragment, { children: element });

/** Root whose single resource reports the tag it deployed with */
function makeTaggedRoot() {
  const executions: string[] = [];
  function Tagged(props: { tag: string }) {
    useAsyncOutput({ tag: props.tag }, async (p, setOutputs) => {
      executions.push(p.tag);
      setOutputs({ tag: p.tag });
    });
    return h(Fragment, {});
  }
  return { Tagged, executions };
}

describe("createRuntime", () => {
  it("mounting the wrapper boots a child universe that deploys to its own stack", async () => {
    const memory = new InMemoryMemory();
    const { Tagged, executions } = makeTaggedRoot();
    const tag = faker.string.uuid();
    const TaggedRuntime = createRuntime(Tagged);

    const result = render(
      () => asRoot(h(TaggedRuntime, { tag }, "child")),
      memory,
      "parent",
    );
    await result.ready;

    // The wrapper node lives in the parent, with runtime-provided outputs
    const wrapper = result.getNodes()[0]!;
    expect(wrapper.id).toBe("tagged-runtime-child");
    expect(wrapper.outputs).toEqual({ status: "ready", ready: true });

    // The child universe deployed under its own stack — the wrapper address
    expect(executions).toEqual([tag]);
    await result.settled();
    const childState = await memory.getState("tagged-runtime-child");
    expect(childState!.nodes[0]!.outputs).toEqual({ tag });

    result.dispose();
  });

  it("with memory omitted the child inherits the parent backend; supplied it keeps a sovereign ledger", async () => {
    const parentMemory = new InMemoryMemory();
    const sovereign = new InMemoryMemory();
    const { Tagged } = makeTaggedRoot();
    const TaggedRuntime = createRuntime(Tagged);

    const result = render(
      () =>
        h(Fragment, {
          children: [
            h(TaggedRuntime, { tag: "inherited" }, "a"),
            h(TaggedRuntime, { tag: "sovereign", memory: sovereign }, "b"),
          ],
        }),
      parentMemory,
      "parent",
    );
    await result.ready;
    await result.settled();

    // Inherited: child ledger lives in the parent's backend
    expect(await parentMemory.getState("tagged-runtime-a")).not.toBeNull();
    // Sovereign: child ledger lives only in its own backend
    expect(await parentMemory.getState("tagged-runtime-b")).toBeNull();
    expect(await sovereign.getState("tagged-runtime-b")).not.toBeNull();

    result.dispose();
  });

  it("requires a key like any resource component", async () => {
    const memory = new InMemoryMemory();
    const { Tagged } = makeTaggedRoot();
    const TaggedRuntime = createRuntime(Tagged);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = render(
      () => asRoot(h(TaggedRuntime, { tag: "x" })),
      memory,
      "parent",
    );

    await expect(result.ready).rejects.toThrow(/has no key/);
    result.dispose();
  });

  it("child deployment failure surfaces as data on the wrapper node", async () => {
    const memory = new InMemoryMemory();
    const message = faker.lorem.sentence();
    vi.spyOn(console, "error").mockImplementation(() => {});

    function Doomed() {
      useAsyncOutput({}, async () => {
        throw new Error(message);
      });
      return h(Fragment, {});
    }
    const DoomedRuntime = createRuntime(Doomed);

    const result = render(
      () => asRoot(h(DoomedRuntime, {}, "child")),
      memory,
      "parent",
    );

    // The parent deployment succeeds — the child's failure is data
    await expect(result.ready).resolves.toBeUndefined();
    expect(result.getNodes()[0]!.outputs).toEqual({
      status: "failed",
      ready: false,
      error: message,
    });

    result.dispose();
  });

  it("child lock-acquisition failure surfaces as data on the wrapper node", async () => {
    const memory = new InMemoryMemory();
    const { Tagged } = makeTaggedRoot();
    const TaggedRuntime = createRuntime(Tagged);
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Someone else already deploys the child's stack
    await memory.acquireLock("tagged-runtime-child", "other", 300);

    const result = render(
      () => asRoot(h(TaggedRuntime, { tag: "x" }, "child")),
      memory,
      "parent",
    );
    await result.ready;

    const outputs = result.getNodes()[0]!.outputs!;
    expect(outputs.status).toBe("failed");
    expect(outputs.error).toMatch(/is locked/);

    result.dispose();
  });

  it("dispose detaches the child; re-mounting re-hydrates from its persisted ledger", async () => {
    const memory = new InMemoryMemory();
    const restored: unknown[] = [];

    function Counter() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs((prev) => {
          restored.push(prev?.boots);
          return { boots: ((prev?.boots as number) ?? 0) + 1 };
        });
      });
      return h(Fragment, {});
    }
    const CounterRuntime = createRuntime(Counter);
    const mount = () =>
      render(() => asRoot(h(CounterRuntime, {}, "child")), memory, "parent");

    const first = mount();
    await first.ready;
    await first.settled();
    first.dispose();

    // Detach is not destroy: the child ledger persists
    const detached = await memory.getState("counter-runtime-child");
    expect(detached!.nodes[0]!.outputs).toEqual({ boots: 1 });

    resetRuntime();
    const second = mount();
    await second.ready;
    await second.settled();

    // Re-mounting re-hydrated (prev seen) and re-converged (boots += 1)
    expect(restored).toEqual([undefined, 1]);
    expect(
      (await memory.getState("counter-runtime-child"))!.nodes[0]!.outputs,
    ).toEqual({ boots: 2 });

    second.dispose();
  });

  it("parent context does not cross the boundary", async () => {
    const memory = new InMemoryMemory();
    const Ctx = createContext<string>("sealed-default");
    const parentValue = faker.string.uuid();
    let seen: string | undefined;

    function Reader() {
      const value = useContext(Ctx);
      useAsyncOutput({}, async (_p, setOutputs) => {
        seen = value;
        setOutputs({ value });
      });
      return h(Fragment, {});
    }
    const ReaderRuntime = createRuntime(Reader);

    const result = render(
      () =>
        Ctx.Provider({
          value: parentValue,
          children: h(ReaderRuntime, {}, "child"),
        }),
      memory,
      "parent",
    );
    await result.ready;

    expect(seen).toBe("sealed-default");

    result.dispose();
  });

  it("context provided inside the child universe works flawlessly", async () => {
    const memory = new InMemoryMemory();
    const Ctx = createContext<string>("unset");
    const childValue = faker.string.uuid();
    const seen: string[] = [];

    function Reader(props: { slot: string }) {
      const value = useContext(Ctx);
      useAsyncOutput({ slot: props.slot }, async (_p, setOutputs) => {
        seen.push(value);
        setOutputs({ value });
      });
      return h(Fragment, {});
    }

    // Provider + consumers live entirely inside the child universe,
    // including a consumer mounted later through a reactive boundary
    const [gate, setGate] = createSignal(false);
    function ChildRoot() {
      return Ctx.Provider({
        value: childValue,
        children: [
          h(Reader, { slot: "eager" }, "eager"),
          Show({ when: gate, children: () => h(Reader, { slot: "late" }, "late") }),
        ],
      });
    }
    const ChildRuntime = createRuntime(ChildRoot);

    const result = render(
      () => asRoot(h(ChildRuntime, {}, "child")),
      memory,
      "parent",
    );
    await result.ready;
    expect(seen).toEqual([childValue]);

    // A consumer rendered later — through the child's own reactive flush —
    // still resolves the child's provider
    setGate(true);
    await vi.waitFor(() => {
      expect(seen).toEqual([childValue, childValue]);
    });

    result.dispose();
  });

  it("one shared Context resolves per-universe when both provide it", async () => {
    const memory = new InMemoryMemory();
    const Ctx = createContext<string>("unset");
    const parentValue = faker.string.uuid();
    const childValue = faker.string.uuid();
    const seen: Record<string, string> = {};

    function Reader(props: { slot: string }) {
      const value = useContext(Ctx);
      useAsyncOutput({ slot: props.slot }, async (p, setOutputs) => {
        seen[p.slot] = value;
        setOutputs({ value });
      });
      return h(Fragment, {});
    }

    function ChildRoot() {
      return Ctx.Provider({
        value: childValue,
        children: h(Reader, { slot: "child" }, "in-child"),
      });
    }
    const ChildRuntime = createRuntime(ChildRoot);

    const result = render(
      () =>
        Ctx.Provider({
          value: parentValue,
          children: [
            h(Reader, { slot: "parent" }, "in-parent"),
            h(ChildRuntime, {}, "child"),
          ],
        }),
      memory,
      "parent",
    );
    await result.ready;

    // Same Context object, two universes, each resolves its own provider
    expect(seen).toEqual({ parent: parentValue, child: childValue });

    result.dispose();
  });

  it("nests to three levels, composing one address scheme all the way down", async () => {
    const memory = new InMemoryMemory();
    let deepestDeployed = false;

    function Leaf() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        deepestDeployed = true;
        setOutputs({ depth: 3 });
      });
      return h(Fragment, {});
    }
    const LeafRuntime = createRuntime(Leaf);

    function Middle() {
      return h(LeafRuntime, {}, "l3");
    }
    const MiddleRuntime = createRuntime(Middle);

    function Top() {
      return h(MiddleRuntime, {}, "l2");
    }
    const TopRuntime = createRuntime(Top);

    const result = render(() => asRoot(h(TopRuntime, {}, "l1")), memory, "root");
    await result.ready;

    // Each level's wrapper deploys inside its parent universe...
    await vi.waitFor(async () => {
      const leafStack = await memory.getState("leaf-runtime-l3");
      expect(leafStack!.nodes[0]!.outputs).toEqual({ depth: 3 });
    });
    expect(deepestDeployed).toBe(true);

    // ...and every universe has its own ledger under its wrapper's address
    expect(await memory.getState("top-runtime-l1")).not.toBeNull();
    expect(await memory.getState("middle-runtime-l2")).not.toBeNull();

    result.dispose();
  });

  it("throws when no Memory is available (outside a runtime, none supplied)", () => {
    const { Tagged } = makeTaggedRoot();
    const TaggedRuntime = createRuntime(Tagged);

    // Rendered on the default context — no parent runtime to inherit from
    expect(() =>
      renderFiber(h(TaggedRuntime, { tag: "x" }, "child"), []),
    ).toThrow(/has no Memory/);
  });

  it("throws when called without a rendering fiber", () => {
    const { Tagged } = makeTaggedRoot();
    const TaggedRuntime = createRuntime(Tagged);

    expect(() => TaggedRuntime({ tag: "x" })).toThrow(/must be rendered/);
  });

  it("names anonymous roots Root", async () => {
    const memory = new InMemoryMemory();
    // Array element keeps the arrow anonymous (no name inference)
    const [anonymousRoot] = [(_props: Record<string, unknown>) => h(Fragment, {})];
    const AnonymousRuntime = createRuntime(anonymousRoot!);

    // The wrapper is named after the fallback
    expect(AnonymousRuntime.name).toBe("RootRuntime");

    const result = render(
      () => asRoot(h(AnonymousRuntime, {}, "child")),
      memory,
      "parent",
    );
    await result.ready;
    expect(result.getNodes()[0]!.id).toBe("root-runtime-child");
    result.dispose();
  });
});

describe("props cross the boundary like any component boundary", () => {
  it("the root receives the exact prop references, callbacks and accessors included", async () => {
    const memory = new InMemoryMemory();
    const config = { region: faker.location.countryCode() };
    const onEvent = vi.fn();
    const [count] = createSignal(faker.number.int(100));
    let received: Record<string, unknown> | undefined;

    function Receiver(props: Record<string, unknown>) {
      received = props;
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ ok: true });
      });
      return h(Fragment, {});
    }
    const ReceiverRuntime = createRuntime(Receiver);

    const result = render(
      () => asRoot(h(ReceiverRuntime, { config, onEvent, count }, "child")),
      memory,
      "parent",
    );
    await result.ready;

    // Verbatim pass-through: identity preserved, no snapshotting
    expect(received!.config).toBe(config);
    expect(received!.onEvent).toBe(onEvent);
    expect(received!.count).toBe(count);

    result.dispose();
  });

  it("in-process reactivity crosses the boundary through the shared tracking graph", async () => {
    const memory = new InMemoryMemory();
    const [level, setLevel] = createSignal(1);
    const childRuns: number[] = [];

    function Scaler(props: { level: () => number }) {
      useAsyncOutput(
        () => ({ level: props.level() }),
        async (p, setOutputs) => {
          childRuns.push(p.level);
          setOutputs({ level: p.level });
        },
      );
      return h(Fragment, {});
    }
    const ScalerRuntime = createRuntime(Scaler);

    const result = render(
      () => asRoot(h(ScalerRuntime, { level }, "child")),
      memory,
      "parent",
    );
    await result.ready;
    expect(childRuns).toEqual([1]);

    // A parent-side signal write re-runs the child resource's handler
    setLevel(2);
    await vi.waitFor(() => {
      expect(childRuns).toEqual([1, 2]);
    });

    // The value the child consumed persists in the child's own ledger
    await vi.waitFor(async () => {
      const childState = await memory.getState("scaler-runtime-child");
      expect(childState!.nodes[0]!.outputs).toEqual({ level: 2 });
    });

    result.dispose();
  });
});
