import { afterEach, describe, expect, it, vi } from "vitest";
import { createContext, useContext } from "../../src/primitives/context";
import { onCleanup } from "../../src/reactive/effect";
import { createSignal } from "../../src/reactive/signal";
import { Fragment, Show } from "../../src/index";
import { InMemoryMemory } from "../../test/helpers/setup";
import { useAsyncOutput } from "../src/instance";
import {
  cleanupFiber,
  collectInstanceNodes,
  getCurrentFiber,
  getCurrentPath,
  renderFiber,
} from "../src/render";
import { render, resetRuntime } from "../src/run";

/** Helper: create a JSX element */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
}

afterEach(() => {
  resetRuntime();
  vi.restoreAllMocks();
});

describe("renderFiber leaf handling", () => {
  it.each([
    { label: "null renders nothing", element: null, type: null },
    { label: "undefined renders nothing", element: undefined, type: null },
    { label: "booleans render nothing", element: true, type: null },
    { label: "strings become text fibers", element: "hello", type: "text" },
    { label: "numbers become text fibers", element: 42, type: "text" },
  ])("$label", ({ element, type }) => {
    const fiber = renderFiber(element, []);

    expect(fiber.type).toBe(type);
  });

  it("keeps the primitive value on text fibers", () => {
    expect(renderFiber("hello", []).props.value).toBe("hello");
    expect(renderFiber(7, []).props.value).toBe(7);
  });

  it("arrays become fragments with positional child paths", () => {
    const fiber = renderFiber(["a", "b"], ["root"]);

    expect(fiber.type).toBe("fragment");
    expect(fiber.children).toHaveLength(2);
    expect(fiber.children[0]?.path).toEqual(["root", "0"]);
  });

  it("elements with exotic types fall back to the 'unknown' path name", () => {
    const fiber = renderFiber({ type: Symbol("weird"), props: {} }, []);

    expect(fiber.path).toEqual(["unknown"]);
  });

  it("string-typed elements use the tag as path segment and render children", () => {
    const fiber = renderFiber(
      { type: "group", props: { children: "inner" } },
      [],
    );

    expect(fiber.path).toEqual(["group"]);
    expect(fiber.children[0]?.type).toBe("text");
  });
});

describe("component execution", () => {
  it("warns when a component returns null instead of using Show", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    function ConditionalTheOldWay() {
      return null;
    }

    renderFiber({ type: ConditionalTheOldWay, props: {} }, []);

    const firstArgs = warnSpy.mock.calls.map((call) => String(call[0]));
    expect(
      firstArgs.some((arg) => arg.includes('"ConditionalTheOldWay" returns null')),
    ).toBe(true);
  });

  it("cleanupFiber runs onCleanup callbacks registered by the component", () => {
    let cleaned = false;

    function WithCleanup() {
      onCleanup(() => {
        cleaned = true;
      });
      return h(Fragment, {});
    }

    const fiber = renderFiber({ type: WithCleanup, props: {} }, []);
    cleanupFiber(fiber);

    expect(cleaned).toBe(true);
  });

  it("collectInstanceNodes tolerates a missing fiber", () => {
    expect(collectInstanceNodes(null as any)).toEqual([]);
  });

  it("no fiber or path is active outside a render pass", () => {
    expect(getCurrentFiber()).toBeNull();
    expect(getCurrentPath()).toEqual([]);
  });
});

describe("provider as the root element", () => {
  it("provides context to the whole tree", async () => {
    const Region = createContext("unset");
    let seen: string | undefined;

    function Db() {
      seen = useContext(Region);
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
      });
      return h(Fragment, {});
    }

    const result = render(
      () => Region.Provider({ value: "root-value", children: h(Db, {}, "db") }),
      new InMemoryMemory(),
      "root-provider",
    );
    await result.ready;

    expect(seen).toBe("root-value");
    result.dispose();
  });
});

describe("reactive boundaries producing non-component children", () => {
  it("an accessor resolving to text re-renders without error", async () => {
    const [label, setLabel] = createSignal("plain-text");

    function App() {
      return () => label();
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "boundary-text",
    );
    await result.ready;

    setLabel("updated-text");
    setLabel(42 as any); // numbers are valid text children too
    await result.settled();

    expect(result.getNodes()).toEqual([]);
    result.dispose();
  });

  it("an accessor resolving to nested arrays flattens into fragments", async () => {
    const [tick, setTick] = createSignal(0);
    const deployed: string[] = [];

    function Item(props: { id: string }) {
      useAsyncOutput(
        () => ({ id: props.id, tick: tick() }),
        async (p: { id: string }, setOutputs) => {
          deployed.push(p.id);
          setOutputs({ ok: true });
        },
      );
      return h(Fragment, {});
    }

    function App() {
      return () => {
        tick(); // subscribe so the boundary re-runs
        return [[h(Item, { id: "a" }, "a"), h(Item, { id: "b" }, "b")]];
      };
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "boundary-nested-array",
    );
    await result.ready;
    await result.settled();

    expect(deployed.slice(0, 2).sort()).toEqual(["a", "b"]);
    result.dispose();
  });
});

describe("context providers through the runtime", () => {
  it("resources read the value provided above them", async () => {
    const Region = createContext("default-region");
    let seenRegion: string | undefined;

    function Db() {
      seenRegion = useContext(Region);
      useAsyncOutput({}, async (_p, setOutputs) => {
        setOutputs({ up: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return Region.Provider({
        value: "eu-west-1",
        children: h(Db, {}, "db"),
      });
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "ctx-provider",
    );
    await result.ready;

    expect(seenRegion).toBe("eu-west-1");
    result.dispose();
  });

  it("providers inside a reactive boundary keep serving their value across re-renders", async () => {
    const Mode = createContext("none");
    const [tick, setTick] = createSignal(0);
    const seen: string[] = [];

    function Reader(props: { tick: number }) {
      seen.push(useContext(Mode));
      useAsyncOutput(
        () => ({ tick: props.tick }),
        async (_p, setOutputs) => {
          setOutputs({ ok: true });
        },
      );
      return h(Fragment, {});
    }

    function App() {
      return () =>
        Mode.Provider({
          value: "stable",
          children: h(Reader, { tick: tick() }, "reader"),
        });
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "ctx-boundary",
    );
    await result.ready;

    setTick(1);
    await result.settled();

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(new Set(seen)).toEqual(new Set(["stable"]));
    result.dispose();
  });
});

describe("fiber reconciliation across reactive re-renders", () => {
  it("plain elements at the same position are updated in place", async () => {
    const [label, setLabel] = createSignal("first");

    function App() {
      // accessor child → reactive boundary re-runs on label change
      return () => ({ type: "banner", props: { text: label() } });
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "positional-update",
    );
    await result.ready;

    setLabel("second");
    await result.settled();

    // No instance nodes — just verifying re-render doesn't blow up
    expect(result.getNodes()).toEqual([]);
    result.dispose();
  });

  it("toggling Show mounts and unmounts nested resources cleanly", async () => {
    const [on, setOn] = createSignal(false);
    let deployCount = 0;

    function Nested() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        deployCount++;
        setOutputs({ up: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return Show({ when: on, children: () => h(Nested, {}, "n") });
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "show-toggle",
    );
    await result.ready;
    expect(deployCount).toBe(0);

    setOn(true);
    await result.settled();
    expect(deployCount).toBe(1);
    expect(result.getNodes()).toHaveLength(1);

    setOn(false);
    await result.settled();
    expect(result.getNodes()).toHaveLength(0);

    result.dispose();
  });
});
