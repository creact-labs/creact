import { describe, expect, it } from "vitest";
import type { Accessor } from "../../src/index";
import { createRoot, createSignal, For, Show } from "../../src/index";
import type { Fiber } from "../src/fiber";
import { renderFiber } from "../src/render";

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

/** Helper: count non-null fibers in the tree */
function _countFibers(fiber: Fiber): number {
  let count = 0;
  function walk(f: Fiber) {
    if (f.type !== null) count++;
    for (const child of f.children) walk(child);
  }
  walk(fiber);
  return count;
}

/** Helper: collect all fiber types in depth-first order */
function _collectTypes(fiber: Fiber): string[] {
  const types: string[] = [];
  function walk(f: Fiber) {
    if (
      f.type !== null &&
      f.type !== "reactive-boundary" &&
      f.type !== "fragment"
    ) {
      types.push(
        typeof f.type === "function"
          ? f.type.name || "Component"
          : String(f.type),
      );
    }
    for (const child of f.children) walk(child);
  }
  walk(fiber);
  return types;
}

/** Helper: create a simple JSX element */
function h(type: any, props?: Record<string, any>, key?: string | number) {
  return { type, props: props || {}, key };
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
