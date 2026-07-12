import { afterEach, describe, expect, it, vi} from "vitest";
import { InMemoryMemory, h } from "@creact-labs/testing";
import { type Accessor, For, Fragment, Show, createRoot, createSignal} from "../../index";
import { createContext, useContext} from "../../primitives/context";
import { onCleanup} from "../../reactive/owner";
import type { Fiber} from "../fiber";
import { useAsyncOutput} from "../instance";
import { cleanupFiber, collectInstanceNodes, getCurrentFiber, getCurrentPath, renderFiber} from "../render";
import { render, resetRuntime} from "../run";

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

describe("anonymous components", () => {
  it("fall back to a generic path name", async () => {
    // array literal prevents TS/JS name inference — a truly anonymous component
    const [Anonymous] = [
      function (props: { children?: any }) {
        void props;
        return h(Fragment, {});
      },
    ];
    Object.defineProperty(Anonymous, "name", { value: "" });

    function App() {
      return h(Anonymous, {});
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "anon-component",
    );
    await result.ready;

    expect(result.getNodes()).toEqual([]);
    result.dispose();
  });

  it("with resources fall back to a generic resource id", async () => {
    const [AnonymousDb] = [
      function () {
        useAsyncOutput({}, async (_p, setOutputs) => {
          setOutputs({ up: true });
        });
        return h(Fragment, {});
      },
    ];
    Object.defineProperty(AnonymousDb, "name", { value: "" });

    function App() {
      return h(AnonymousDb, {}, "anon");
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "anon-resource",
    );
    await result.ready;

    expect(result.getNodes()[0]?.id).toBe("instance-anon");
    result.dispose();
  });
});

describe("boundaries yielding empty children", () => {
  it("arrays with null and false entries render only the real children", async () => {
    let deployed = 0;

    function Real() {
      useAsyncOutput({}, async (_p, setOutputs) => {
        deployed++;
        setOutputs({ ok: true });
      });
      return h(Fragment, {});
    }

    function App() {
      return () => [h(Real, {}, "real"), null, false];
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "sparse-children",
    );
    await result.ready;
    await result.settled();

    expect(deployed).toBe(1);
    expect(result.getNodes()).toHaveLength(1);
    result.dispose();
  });

  it("a boundary resolving to null renders nothing", async () => {
    function App() {
      return () => null;
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "null-boundary",
    );
    await result.ready;

    expect(result.getNodes()).toEqual([]);
    result.dispose();
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
    const [tick] = createSignal(0);
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
  it("swapping the element type at a position replaces the fiber cleanly", async () => {
    const [kind, setKind] = createSignal<"banner" | "panel">("banner");

    function App() {
      // accessor child re-runs on kind change, alternating plain element types
      return () => ({ type: kind(), props: { label: kind() } });
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "type-swap",
    );
    await result.ready;

    setKind("panel");
    setKind("banner");
    await result.settled();

    expect(result.getNodes()).toEqual([]);
    result.dispose();
  });

  it("keyed plain elements re-render under their key path", async () => {
    const [tick, setTick] = createSignal(0);

    function App() {
      return () => ({
        type: "row",
        props: { tick: tick() },
        key: "stable-key",
      });
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "keyed-plain",
    );
    await result.ready;

    setTick(1);
    await result.settled();

    expect(result.getNodes()).toEqual([]);
    result.dispose();
  });

  it("a provider replaced by a plain element tears down and rebuilds", async () => {
    const Mode = createContext("none");
    const [showProvider, setShowProvider] = createSignal(true);

    function App() {
      return () =>
        showProvider()
          ? Mode.Provider({ value: "on", children: h(Fragment, {}) })
          : { type: "plain", props: {} };
    }

    const result = render(
      () => h(App, {}, "app"),
      new InMemoryMemory(),
      "provider-swap",
    );
    await result.ready;

    setShowProvider(false);
    setShowProvider(true);
    await result.settled();

    expect(result.getNodes()).toEqual([]);
    result.dispose();
  });

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

/**
 * Render-layer reactivity tests
 *
 * These test Show/For reactive behavior in the runtime context,
 * verifying fiber tree structure instead of DOM output.
 *
 * When reactive boundaries re-render (signals change), the fiber tree must
 * preserve children correctly — not lose them or create zombies.
 */

/** Helper: find all fibers of a given type in the tree */
function findFibers(fiber: Fiber, predicate: (f: Fiber) => boolean): Fiber[] {
  const result: Fiber[] = [];
  function walk(f: Fiber) {
    if (predicate(f)) result.push(f);
    for (const child of f.children) walk(child);
  }
  walk(fiber);
  return result;
}

describe("renderFiber — Show reactive boundary", () => {
  it("renders children when condition is truthy", () => {
    createRoot(() => {
      const show = Show({
        when: true,
        children: h("child", { value: "hello" }),
      });

      const fiber = renderFiber(show, ["root"]);
      const children = findFibers(fiber, (f) => f.type === "child");
      expect(children.length).toBe(1);
      expect(children[0]!.props.value).toBe("hello");
    });
  });

  it("renders nothing when condition is falsy", () => {
    createRoot(() => {
      const show = Show({
        when: false,
        children: h("child"),
      });

      const fiber = renderFiber(show, ["root"]);
      const children = findFibers(fiber, (f) => f.type === "child");
      expect(children.length).toBe(0);
    });
  });

  it("fiber tree updates when Show condition toggles", () => {
    createRoot(() => {
      const [visible, setVisible] = createSignal(false);
      const show = Show({
        when: () => visible(),
        children: h("content", { value: "hello" }),
        fallback: h("fallback"),
      });

      const fiber = renderFiber(show, ["root"]);

      // Initially hidden — fallback rendered
      expect(findFibers(fiber, (f) => f.type === "fallback").length).toBe(1);
      expect(findFibers(fiber, (f) => f.type === "content").length).toBe(0);

      // Toggle on
      setVisible(true);
      expect(findFibers(fiber, (f) => f.type === "content").length).toBe(1);
      expect(findFibers(fiber, (f) => f.type === "fallback").length).toBe(0);
      expect(
        findFibers(fiber, (f) => f.type === "content")[0]!.props.value,
      ).toBe("hello");

      // Toggle off
      setVisible(false);
      expect(findFibers(fiber, (f) => f.type === "content").length).toBe(0);
      expect(findFibers(fiber, (f) => f.type === "fallback").length).toBe(1);
    });
  });

  it("preserves nested fiber structure when Show condition value changes but truthiness stays", () => {
    createRoot(() => {
      const [count, setCount] = createSignal(1);

      // Show with function children — non-keyed
      const show = Show({
        when: () => count(),
        children: (val: () => number) => h("child", { v: val() }),
      });

      const fiber = renderFiber(show, ["root"]);

      // Initial — truthy
      let children = findFibers(fiber, (f) => f.type === "child");
      expect(children.length).toBe(1);

      // Change value, truthiness stays same
      setCount(5);

      // Children must still be present
      children = findFibers(fiber, (f) => f.type === "child");
      expect(children.length).toBe(1);

      // Change value again
      setCount(99);
      children = findFibers(fiber, (f) => f.type === "child");
      expect(children.length).toBe(1);
    });
  });
});

describe("renderFiber — For reactive boundary", () => {
  it("renders list items as fibers", () => {
    createRoot(() => {
      const items = ["a", "b", "c"];
      const forResult = For({
        each: () => items,
        children: (item: Accessor<string>) => h("item", { value: item() }),
      });

      const fiber = renderFiber(forResult, ["root"]);
      const itemFibers = findFibers(fiber, (f) => f.type === "item");
      expect(itemFibers.length).toBe(3);
      expect(itemFibers.map((f) => f.props.value)).toEqual(["a", "b", "c"]);
    });
  });

  it("fiber tree updates when list changes", () => {
    createRoot(() => {
      const a = { v: "a" };
      const b = { v: "b" };
      const c = { v: "c" };
      const [list, setList] = createSignal([a, b, c]);

      const forResult = For({
        each: () => list(),
        children: (item: Accessor<{ v: string }>) =>
          h("item", { value: item().v }),
      });

      const fiber = renderFiber(forResult, ["root"]);

      let itemFibers = findFibers(fiber, (f) => f.type === "item");
      expect(itemFibers.map((f) => f.props.value)).toEqual(["a", "b", "c"]);

      // Remove one
      setList([a, c]);
      itemFibers = findFibers(fiber, (f) => f.type === "item");
      expect(itemFibers.map((f) => f.props.value)).toEqual(["a", "c"]);

      // Add one
      const d = { v: "d" };
      setList([a, c, d]);
      itemFibers = findFibers(fiber, (f) => f.type === "item");
      expect(itemFibers.map((f) => f.props.value)).toEqual(["a", "c", "d"]);

      // Reorder
      setList([d, a, c]);
      itemFibers = findFibers(fiber, (f) => f.type === "item");
      expect(itemFibers.map((f) => f.props.value)).toEqual(["d", "a", "c"]);
    });
  });

  it("fiber tree updates correctly when list is fully replaced", () => {
    createRoot(() => {
      const [list, setList] = createSignal([{ v: "a" }, { v: "b" }]);

      const forResult = For({
        each: () => list(),
        children: (item: Accessor<{ v: string }>) =>
          h("item", { value: item().v }),
      });

      const fiber = renderFiber(forResult, ["root"]);

      let itemFibers = findFibers(fiber, (f) => f.type === "item");
      expect(itemFibers.map((f) => f.props.value)).toEqual(["a", "b"]);

      // Full replace
      setList([{ v: "x" }, { v: "y" }, { v: "z" }]);
      itemFibers = findFibers(fiber, (f) => f.type === "item");
      expect(itemFibers.map((f) => f.props.value)).toEqual(["x", "y", "z"]);
    });
  });
});

describe("renderFiber — nested Show inside For", () => {
  it("Show children inside For items survive list update", () => {
    createRoot(() => {
      const a = { id: "a", visible: true };
      const b = { id: "b", visible: true };
      const [list, setList] = createSignal([a, b]);

      const forResult = For({
        each: () => list(),
        children: (item: Accessor<{ id: string; visible: boolean }>) =>
          Show({
            when: () => item().visible,
            children: h("visible-item", { id: item().id }),
            fallback: h("hidden-item", { id: item().id }),
          }),
      });

      const fiber = renderFiber(forResult, ["root"]);

      let visibleItems = findFibers(fiber, (f) => f.type === "visible-item");
      expect(visibleItems.length).toBe(2);

      // Add item — existing items must survive
      const c = { id: "c", visible: true };
      setList([a, b, c]);
      visibleItems = findFibers(fiber, (f) => f.type === "visible-item");
      expect(visibleItems.length).toBe(3);
    });
  });

  it("For with multiple Show children — all preserve after list reorder", () => {
    createRoot(() => {
      const a = { id: "a" };
      const b = { id: "b" };
      const c = { id: "c" };
      const [list, setList] = createSignal([a, b, c]);
      const [visible, setVisible] = createSignal(true);

      const forResult = For({
        each: () => list(),
        children: (item: Accessor<{ id: string }>) =>
          Show({
            when: () => visible(),
            children: h("item", { id: item().id }),
          }),
      });

      const fiber = renderFiber(forResult, ["root"]);

      let items = findFibers(fiber, (f) => f.type === "item");
      expect(items.length).toBe(3);
      expect(items.map((f) => f.props.id)).toEqual(["a", "b", "c"]);

      // Reorder list
      setList([c, a, b]);
      items = findFibers(fiber, (f) => f.type === "item");
      expect(items.length).toBe(3);
      expect(items.map((f) => f.props.id)).toEqual(["c", "a", "b"]);

      // Toggle visibility AFTER reorder — all Shows must still respond
      setVisible(false);
      items = findFibers(fiber, (f) => f.type === "item");
      expect(items.length).toBe(0);

      setVisible(true);
      items = findFibers(fiber, (f) => f.type === "item");
      expect(items.length).toBe(3);
    });
  });
});

describe("renderFiber — For with function components", () => {
  it("function components inside For survive list changes", () => {
    function Item(props: { id: string }) {
      return h("rendered-item", { id: props.id });
    }

    createRoot(() => {
      const a = { id: "a" };
      const b = { id: "b" };
      const [list, setList] = createSignal([a, b]);

      const forResult = For({
        each: () => list(),
        children: (item: Accessor<{ id: string }>) =>
          h(Item, { id: item().id }),
      });

      const fiber = renderFiber(forResult, ["root"]);

      let items = findFibers(fiber, (f) => f.type === "rendered-item");
      expect(items.length).toBe(2);

      // Add item
      const c = { id: "c" };
      setList([a, b, c]);
      items = findFibers(fiber, (f) => f.type === "rendered-item");
      expect(items.length).toBe(3);

      // Remove item
      setList([a, c]);
      items = findFibers(fiber, (f) => f.type === "rendered-item");
      expect(items.length).toBe(2);
      expect(items.map((f) => f.props.id)).toEqual(["a", "c"]);
    });
  });

  it("multiple same-type function components in For preserve all children", () => {
    function Card(props: { label: string }) {
      return Show({
        when: true,
        children: h("card-content", { label: props.label }),
      });
    }

    createRoot(() => {
      const a = { id: "a" };
      const b = { id: "b" };
      const c = { id: "c" };
      const [list, setList] = createSignal([a, b, c]);

      const forResult = For({
        each: () => list(),
        children: (item: Accessor<{ id: string }>) =>
          h(Card, { label: item().id }),
      });

      const fiber = renderFiber(forResult, ["root"]);

      // All three Cards must have their content
      let cards = findFibers(fiber, (f) => f.type === "card-content");
      expect(cards.length).toBe(3);
      expect(cards.map((f) => f.props.label)).toEqual(["a", "b", "c"]);

      // Reorder — all three must survive
      setList([c, a, b]);
      cards = findFibers(fiber, (f) => f.type === "card-content");
      expect(cards.length).toBe(3);
      expect(cards.map((f) => f.props.label)).toEqual(["c", "a", "b"]);

      // Add item — all four must be present
      const d = { id: "d" };
      setList([c, a, b, d]);
      cards = findFibers(fiber, (f) => f.type === "card-content");
      expect(cards.length).toBe(4);
      expect(cards.map((f) => f.props.label)).toEqual(["c", "a", "b", "d"]);
    });
  });
});

describe("renderFiber — Show inside Show", () => {
  it("inner Show survives outer condition value change (same truthiness)", () => {
    createRoot(() => {
      const [outer, setOuter] = createSignal<string>("hello");
      const [inner, setInner] = createSignal(true);

      const show = Show({
        when: () => outer(),
        children: (val: () => string) =>
          Show({
            when: () => inner(),
            children: h("inner-content", { text: val() }),
          }),
      });

      const fiber = renderFiber(show, ["root"]);

      // Initial state
      let content = findFibers(fiber, (f) => f.type === "inner-content");
      expect(content.length).toBe(1);

      // Change outer value, truthiness stays same
      setOuter("world");
      content = findFibers(fiber, (f) => f.type === "inner-content");
      expect(content.length).toBe(1);

      // Toggle inner
      setInner(false);
      content = findFibers(fiber, (f) => f.type === "inner-content");
      expect(content.length).toBe(0);

      // Toggle inner back
      setInner(true);
      content = findFibers(fiber, (f) => f.type === "inner-content");
      expect(content.length).toBe(1);
    });
  });
});

describe("renderFiber — For inside Show", () => {
  it("For items survive Show condition value change", () => {
    createRoot(() => {
      const [condition, setCondition] = createSignal<string>("v1");
      const a = { id: "a" };
      const b = { id: "b" };

      const show = Show({
        when: () => condition(),
        children: (_val: () => string) =>
          For({
            each: () => [a, b],
            children: (item: Accessor<{ id: string }>) =>
              h("for-item", { id: item().id }),
          }),
      });

      const fiber = renderFiber(show, ["root"]);

      let items = findFibers(fiber, (f) => f.type === "for-item");
      expect(items.length).toBe(2);
      expect(items.map((f) => f.props.id)).toEqual(["a", "b"]);

      // Change condition value (truthiness stays same) — For items must survive
      setCondition("v2");
      items = findFibers(fiber, (f) => f.type === "for-item");
      expect(items.length).toBe(2);
      expect(items.map((f) => f.props.id)).toEqual(["a", "b"]);
    });
  });

  it("For items fully recreated when Show toggles off and on", () => {
    createRoot(() => {
      const [visible, setVisible] = createSignal(true);
      const a = { id: "a" };
      const b = { id: "b" };
      const [list] = createSignal([a, b]);

      const show = Show({
        when: () => visible(),
        children: For({
          each: () => list(),
          children: (item: Accessor<{ id: string }>) =>
            h("for-item", { id: item().id }),
        }),
      });

      const fiber = renderFiber(show, ["root"]);

      let items = findFibers(fiber, (f) => f.type === "for-item");
      expect(items.length).toBe(2);

      // Toggle off
      setVisible(false);
      items = findFibers(fiber, (f) => f.type === "for-item");
      expect(items.length).toBe(0);

      // Toggle on
      setVisible(true);
      items = findFibers(fiber, (f) => f.type === "for-item");
      expect(items.length).toBe(2);
    });
  });
});
