import { describe, expect, it } from "vitest";
import type { Accessor, JSXElement } from "../../src/index";
import {
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  For,
  mapArray,
  onCleanup,
  Show,
} from "../../src/index";

const h = (type: string, props: Record<string, any> = {}): JSXElement => ({
  type,
  props,
});

/**
 * Nested reactivity tests — reactive state inside For/Show must survive re-renders.
 *
 * These test patterns that trigger the reactive boundary bug:
 * When a parent reactive boundary re-renders (e.g. For list changes),
 * child reactive state (memos, effects, owners) must be preserved.
 */

describe("reactive state inside mapArray items", () => {
  it("memos inside mapped items respond to external signal after list reorder", () => {
    createRoot(() => {
      const [multiplier, setMultiplier] = createSignal(1);
      const a = { id: "a", v: 10 };
      const b = { id: "b", v: 20 };
      const c = { id: "c", v: 30 };
      const [list, setList] = createSignal([a, b, c]);

      const result = createMemo(
        mapArray(list, (item) => {
          // Internal memo depends on both item and external signal
          return createMemo(() => item().v * multiplier());
        }),
      );

      expect(result().map((r) => r())).toEqual([10, 20, 30]);

      // External signal change — all memos react
      setMultiplier(2);
      expect(result().map((r) => r())).toEqual([20, 40, 60]);

      // Reorder list
      setList([c, a, b]);
      expect(result().map((r) => r())).toEqual([60, 20, 40]);

      // External signal change AFTER reorder — memos must still work
      setMultiplier(3);
      expect(result().map((r) => r())).toEqual([90, 30, 60]);
    });
  });

  it("memos inside mapped items respond to external signal after item addition", () => {
    createRoot(() => {
      const [multiplier, setMultiplier] = createSignal(1);
      const a = { id: "a", v: 10 };
      const b = { id: "b", v: 20 };
      const [list, setList] = createSignal([a, b]);

      const result = createMemo(
        mapArray(list, (item) => {
          return createMemo(() => item().v * multiplier());
        }),
      );

      expect(result().map((r) => r())).toEqual([10, 20]);

      // Add item
      const c = { id: "c", v: 30 };
      setList([a, b, c]);
      expect(result().map((r) => r())).toEqual([10, 20, 30]);

      // External signal change — ALL memos (old and new) must react
      setMultiplier(5);
      expect(result().map((r) => r())).toEqual([50, 100, 150]);
    });
  });

  it("effects inside mapped items survive list reorder", () => {
    const effectLog: string[] = [];
    const a = { id: "a", v: 10 };
    const b = { id: "b", v: 20 };
    let setMultiplier!: (v: number) => void;
    let setList!: (v: { id: string; v: number }[]) => void;

    createRoot(() => {
      const [multiplier, _setMultiplier] = createSignal(1);
      setMultiplier = _setMultiplier;
      const [list, _setList] = createSignal([a, b]);
      setList = _setList;

      createMemo(
        mapArray(list, (item) => {
          createEffect(() => {
            effectLog.push(`${item().id}:${item().v * multiplier()}`);
          });
          return item().id;
        }),
      );
    });

    // Effects are deferred — they fire after createRoot's fn completes
    expect(effectLog).toEqual(["a:10", "b:20"]);

    // Reorder — effects should not re-run (no deps changed)
    setList([b, a]);
    expect(effectLog).toEqual(["a:10", "b:20"]);

    // Change external signal — effects for BOTH items must fire
    setMultiplier(2);
    expect(effectLog).toEqual(["a:10", "b:20", "a:20", "b:40"]);
  });

  it("onCleanup fires for removed items but not reordered items", () => {
    createRoot(() => {
      const a = { id: "a" };
      const b = { id: "b" };
      const c = { id: "c" };
      const [list, setList] = createSignal([a, b, c]);

      const cleanups: string[] = [];

      createMemo(
        mapArray(list, (item) => {
          onCleanup(() => cleanups.push(`cleanup:${item().id}`));
          return item().id;
        }),
      );

      expect(cleanups).toEqual([]);

      // Reorder — no cleanups should fire
      setList([c, a, b]);
      expect(cleanups).toEqual([]);

      // Remove b
      setList([c, a]);
      expect(cleanups).toEqual(["cleanup:b"]);

      // Remove all remaining
      setList([]);
      expect(cleanups).toContain("cleanup:a");
      expect(cleanups).toContain("cleanup:c");
    });
  });
});

describe("reactive state inside mapArray with keyFn", () => {
  it("memos survive when list items are replaced with same key", () => {
    createRoot(() => {
      const [multiplier, setMultiplier] = createSignal(1);
      const [list, setList] = createSignal([
        { id: "a", v: 10 },
        { id: "b", v: 20 },
      ]);

      const result = createMemo(
        mapArray(
          list,
          (item) => {
            return createMemo(() => item().v * multiplier());
          },
          { keyFn: (x) => x.id },
        ),
      );

      expect(result().map((r) => r())).toEqual([10, 20]);

      // Replace items with same keys but different values
      setList([
        { id: "a", v: 100 },
        { id: "b", v: 200 },
      ]);
      expect(result().map((r) => r())).toEqual([100, 200]);

      // External signal change — memos must still react
      setMultiplier(3);
      expect(result().map((r) => r())).toEqual([300, 600]);
    });
  });

  it("memos survive when item is added with keyFn", () => {
    createRoot(() => {
      const [multiplier, setMultiplier] = createSignal(1);
      const [list, setList] = createSignal([{ id: "a", v: 10 }]);

      const result = createMemo(
        mapArray(
          list,
          (item) => {
            return createMemo(() => item().v * multiplier());
          },
          { keyFn: (x) => x.id },
        ),
      );

      expect(result().map((r) => r())).toEqual([10]);

      // Add item
      setList([
        { id: "a", v: 10 },
        { id: "b", v: 20 },
      ]);
      expect(result().map((r) => r())).toEqual([10, 20]);

      // Multiplier change — both memos must react
      setMultiplier(4);
      expect(result().map((r) => r())).toEqual([40, 80]);
    });
  });
});

describe("nested Show inside For", () => {
  it("Show accessor inside For item survives list reorder", () => {
    createRoot(() => {
      const a = { id: "a", visible: true };
      const b = { id: "b", visible: true };
      const c = { id: "c", visible: false };
      const [list, setList] = createSignal([a, b, c]);

      const result = createMemo(
        mapArray(list, (item) => {
          const show = Show({
            when: () => item().visible,
            children: h("t", { v: `content:${item().id}` }),
            fallback: h("t", { v: `hidden:${item().id}` }),
          }) as unknown as () => any;
          return show;
        }),
      );

      expect(result().map((r) => r().props.v)).toEqual([
        "content:a",
        "content:b",
        "hidden:c",
      ]);

      // Reorder — Show states should follow their items
      setList([c, a, b]);
      expect(result().map((r) => r().props.v)).toEqual([
        "hidden:c",
        "content:a",
        "content:b",
      ]);
    });
  });

  it("Show with function children inside For — accessor updates after list change", () => {
    createRoot(() => {
      const [multiplier, setMultiplier] = createSignal(1);
      const a = { id: "a", v: 10 };
      const b = { id: "b", v: 20 };
      const [list, setList] = createSignal([a, b]);

      const result = createMemo(
        mapArray(list, (item) => {
          return Show({
            when: () => item().v > 0,
            children: (_val: () => any) => {
              // Internal memo inside Show children
              return createMemo(() => h("t", { n: item().v * multiplier() }));
            },
          }) as unknown as () => any;
        }),
      );

      // result() = [showAccessor_a, showAccessor_b]
      // Each showAccessor() returns the memo from children function
      expect(result().map((r) => r()().props.n)).toEqual([10, 20]);

      // Add item
      const c = { id: "c", v: 30 };
      setList([a, b, c]);

      // Multiplier change — ALL memos must react
      setMultiplier(2);
      expect(result().map((r) => r()().props.n)).toEqual([20, 40, 60]);
    });
  });

  it("Show inside For — condition toggle after list change", () => {
    createRoot(() => {
      const [visible, setVisible] = createSignal(true);
      const a = { id: "a" };
      const b = { id: "b" };
      const [list, setList] = createSignal([a, b]);

      const result = createMemo(
        mapArray(list, (item) => {
          return Show({
            when: () => visible(),
            children: h("t", { v: `yes:${item().id}` }),
            fallback: h("t", { v: `no:${item().id}` }),
          }) as unknown as () => any;
        }),
      );

      expect(result().map((r) => r().props.v)).toEqual(["yes:a", "yes:b"]);

      // Add item
      const c = { id: "c" };
      setList([a, b, c]);
      expect(result().map((r) => r().props.v)).toEqual([
        "yes:a",
        "yes:b",
        "yes:c",
      ]);

      // Toggle visibility AFTER list change — all Shows must react
      setVisible(false);
      expect(result().map((r) => r().props.v)).toEqual([
        "no:a",
        "no:b",
        "no:c",
      ]);

      setVisible(true);
      expect(result().map((r) => r().props.v)).toEqual([
        "yes:a",
        "yes:b",
        "yes:c",
      ]);
    });
  });
});

describe("nested Show inside Show", () => {
  it("inner Show accessor survives when outer condition value changes (same truthiness)", () => {
    createRoot(() => {
      const [outer, setOuter] = createSignal<string>("hello");
      const [inner, setInner] = createSignal(1);

      const outerShow = Show({
        when: () => outer(),
        children: (val: () => string) => {
          // Inner Show depends on different signal
          return Show({
            when: () => inner() > 0,
            children: createMemo(() => h("t", { v: `${val()}:${inner()}` })),
            fallback: h("t", { v: "inner-hidden" }),
          });
        },
      }) as unknown as () => any;

      // outer truthy, inner truthy
      expect(outerShow()()().props.v).toBe("hello:1");

      // Change outer value, truthiness stays same — inner must survive
      setOuter("world");
      expect(outerShow()()().props.v).toBe("world:1");

      // Change inner signal — must react
      setInner(42);
      expect(outerShow()()().props.v).toBe("world:42");
    });
  });

  it("inner Show toggles correctly when outer is stable", () => {
    createRoot(() => {
      const [outer] = createSignal(true);
      const [inner, setInner] = createSignal(true);

      const bothVisible = h("t", { v: "both-visible" });
      const innerHidden = h("t", { v: "inner-hidden" });

      const outerShow = Show({
        when: () => outer(),
        children: Show({
          when: () => inner(),
          children: bothVisible,
          fallback: innerHidden,
        }),
      }) as unknown as () => any;

      expect(outerShow()()).toBe(bothVisible);

      setInner(false);
      expect(outerShow()()).toBe(innerHidden);

      setInner(true);
      expect(outerShow()()).toBe(bothVisible);
    });
  });
});

describe("For inside Show", () => {
  it("For items survive Show condition value change (same truthiness)", () => {
    createRoot(() => {
      const [condition, setCondition] = createSignal<string>("v1");
      const a = { id: "a" };
      const b = { id: "b" };
      const [list, setList] = createSignal([a, b]);

      const show = Show({
        when: () => condition(),
        children: (val: () => string) => {
          return For({
            each: () => list(),
            children: (item: Accessor<{ id: string }>) =>
              createMemo(() => h("t", { label: `${val()}:${item().id}` })),
          });
        },
      }) as unknown as () => any;

      // show() returns For accessor, For accessor returns mapped array
      expect(show()().map((m: any) => m().props.label)).toEqual([
        "v1:a",
        "v1:b",
      ]);

      // Change condition value (truthiness stays same) — For items must survive
      setCondition("v2");
      expect(show()().map((m: any) => m().props.label)).toEqual([
        "v2:a",
        "v2:b",
      ]);

      // Add item to For
      const c = { id: "c" };
      setList([a, b, c]);
      expect(show()().map((m: any) => m().props.label)).toEqual([
        "v2:a",
        "v2:b",
        "v2:c",
      ]);
    });
  });

  it("For items are recreated when Show toggles off and on", () => {
    createRoot(() => {
      const [visible, setVisible] = createSignal(true);
      const a = { id: "a" };
      const b = { id: "b" };

      let mapCallCount = 0;

      const show = Show({
        when: () => visible(),
        children: For({
          each: () => [a, b],
          children: (item: Accessor<{ id: string }>) => {
            mapCallCount++;
            return h("item", { v: item().id });
          },
        }),
      }) as unknown as () => any;

      expect(show()().map((el: JSXElement) => el.props.v)).toEqual(["a", "b"]);
      expect(mapCallCount).toBe(2);

      // Toggle off
      setVisible(false);
      expect(show()).toBeUndefined();

      // Toggle on — static children are preserved (non-keyed), For is NOT re-created
      setVisible(true);
      expect(show()().map((el: JSXElement) => el.props.v)).toEqual(["a", "b"]);
      expect(mapCallCount).toBe(2); // same For accessor reused
    });
  });
});

describe("For with keyFn — nested reactive state", () => {
  it("memo inside For with keyFn reacts to item value change", () => {
    createRoot(() => {
      const [list, setList] = createSignal([
        { id: "a", v: 1 },
        { id: "b", v: 2 },
      ]);

      const result = createMemo(
        mapArray(
          list,
          (item) => {
            return createMemo(() =>
              h("t", { label: `${item().id}:${item().v}` }),
            );
          },
          { keyFn: (x) => x.id },
        ),
      );

      expect(result().map((r) => r().props.label)).toEqual(["a:1", "b:2"]);

      // Update value for existing key
      setList([
        { id: "a", v: 10 },
        { id: "b", v: 20 },
      ]);
      expect(result().map((r) => r().props.label)).toEqual(["a:10", "b:20"]);

      // Add item and update existing
      setList([
        { id: "a", v: 100 },
        { id: "b", v: 200 },
        { id: "c", v: 300 },
      ]);
      expect(result().map((r) => r().props.label)).toEqual([
        "a:100",
        "b:200",
        "c:300",
      ]);
    });
  });

  it("external signal change works after keyFn list update", () => {
    createRoot(() => {
      const [suffix, setSuffix] = createSignal("");
      const [list, setList] = createSignal([
        { id: "a", v: "hello" },
        { id: "b", v: "world" },
      ]);

      const result = createMemo(
        mapArray(
          list,
          (item) => {
            return createMemo(() =>
              h("t", { label: `${item().v}${suffix()}` }),
            );
          },
          { keyFn: (x) => x.id },
        ),
      );

      expect(result().map((r) => r().props.label)).toEqual(["hello", "world"]);

      // Update item values via keyFn match
      setList([
        { id: "a", v: "HI" },
        { id: "b", v: "THERE" },
      ]);
      expect(result().map((r) => r().props.label)).toEqual(["HI", "THERE"]);

      // External signal — all memos must react
      setSuffix("!");
      expect(result().map((r) => r().props.label)).toEqual(["HI!", "THERE!"]);
    });
  });
});
