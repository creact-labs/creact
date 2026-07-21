import { afterEach, describe, expect, it} from "vitest";
import { InMemoryMemory } from "@creact-labs/testing";
import { type Accessor, For, type JSXElement, Show, createEffect, createMemo, createRoot, createSignal, indexArray, mapArray, onCleanup} from "../../index";
import { useAsyncOutput} from "../../runtime/instance";
import { render, resetRuntime} from "../../runtime/run";

/**
 * For control flow + mapArray/indexArray tests
 *
 * Since CReact doesn't render to DOM, we test the reactive array
 * returned by For/mapArray/indexArray. The accessor returns the
 * mapped array which updates when the source list changes.
 */

describe("mapArray", () => {
  it("simple mapArray", () => {
    createRoot(() => {
      const [s, set] = createSignal([1, 2, 3, 4]);
      const r = createMemo(mapArray(s, (v) => v() * 2));
      expect(r()).toEqual([2, 4, 6, 8]);
      set([3, 4, 5]);
      expect(r()).toEqual([6, 8, 10]);
    });
  });

  it("show fallback", () => {
    createRoot(() => {
      const [s, set] = createSignal([1, 2, 3, 4]);
      const double = mapArray<number, number | string>(s, (v) => v() * 2, {
        fallback: () => "Empty",
      });
      const r = createMemo(double);
      expect(r()).toEqual([2, 4, 6, 8]);
      set([]);
      expect(r()).toEqual(["Empty"]);
      set([3, 4, 5]);
      expect(r()).toEqual([6, 8, 10]);
    });
  });

  it("preserves mapped results for reused items", () => {
    createRoot(() => {
      const n1 = { id: 1 };
      const n2 = { id: 2 };
      const n3 = { id: 3 };
      const n4 = { id: 4 };

      const [list, setList] = createSignal([n1, n2, n3, n4]);

      const r = createMemo(
        mapArray(list, (item) => {
          const result = { value: item().id, ref: item() };
          return result;
        }),
      );

      expect(r().length).toBe(4);
      const initial = [...r()];

      // Reorder — mapped results should be reused
      setList([n3, n1, n4, n2]);
      const reordered = r();
      expect(reordered.length).toBe(4);
      // Items should be the same object references
      expect(reordered[0]).toBe(initial[2]); // n3's mapping
      expect(reordered[1]).toBe(initial[0]); // n1's mapping
      expect(reordered[2]).toBe(initial[3]); // n4's mapping
      expect(reordered[3]).toBe(initial[1]); // n2's mapping
    });
  });

  it("disposes removed items", () => {
    createRoot(() => {
      const n1 = { id: 1 };
      const n2 = { id: 2 };
      const n3 = { id: 3 };
      const [list, setList] = createSignal([n1, n2, n3]);
      const r = createMemo(mapArray(list, (v) => v().id));

      expect(r()).toEqual([1, 2, 3]);
      setList([n1, n3]);
      expect(r()).toEqual([1, 3]);
      setList([]);
      expect(r()).toEqual([]);
    });
  });

  it("handles swaps", () => {
    createRoot(() => {
      const a = { v: "a" };
      const b = { v: "b" };
      const c = { v: "c" };
      const d = { v: "d" };
      const [list, setList] = createSignal([a, b, c, d]);
      const r = createMemo(mapArray(list, (v) => v().v));

      expect(r()).toEqual(["a", "b", "c", "d"]);

      // Swap first two
      setList([b, a, c, d]);
      expect(r()).toEqual(["b", "a", "c", "d"]);

      // Swap first and last
      setList([d, a, c, b]);
      expect(r()).toEqual(["d", "a", "c", "b"]);
    });
  });

  it("handles rotations", () => {
    createRoot(() => {
      const a = { v: "a" };
      const b = { v: "b" };
      const c = { v: "c" };
      const d = { v: "d" };
      const [list, setList] = createSignal([a, b, c, d]);
      const r = createMemo(mapArray(list, (v) => v().v));

      setList([b, c, d, a]);
      expect(r()).toEqual(["b", "c", "d", "a"]);

      setList([c, d, a, b]);
      expect(r()).toEqual(["c", "d", "a", "b"]);

      setList([d, a, b, c]);
      expect(r()).toEqual(["d", "a", "b", "c"]);
    });
  });

  it("handles reversal", () => {
    createRoot(() => {
      const a = { v: "a" };
      const b = { v: "b" };
      const c = { v: "c" };
      const d = { v: "d" };
      const [list, setList] = createSignal([a, b, c, d]);
      const r = createMemo(mapArray(list, (v) => v().v));

      setList([d, c, b, a]);
      expect(r()).toEqual(["d", "c", "b", "a"]);
    });
  });

  it("handles full replace", () => {
    createRoot(() => {
      const [list, setList] = createSignal([
        { v: "a" },
        { v: "b" },
        { v: "c" },
      ]);
      const r = createMemo(mapArray(list, (v) => v().v));

      expect(r()).toEqual(["a", "b", "c"]);

      setList([{ v: "x" }, { v: "y" }, { v: "z" }]);
      expect(r()).toEqual(["x", "y", "z"]);
    });
  });

  it("updates indexes when items reorder", () => {
    createRoot(() => {
      const a = { v: "a" };
      const b = { v: "b" };
      const c = { v: "c" };
      const [list, setList] = createSignal([a, b, c]);

      // Use createMemo inside mapFn to make index reactive
      const r = createMemo(
        mapArray(list, (v, i) => {
          return createMemo(() => `${v().v}:${i()}`);
        }),
      );

      expect(r().map((m) => m())).toEqual(["a:0", "b:1", "c:2"]);

      setList([c, a, b]);
      expect(r().map((m) => m())).toEqual(["c:0", "a:1", "b:2"]);
    });
  });
});

describe("indexArray", () => {
  it("simple indexArray", () => {
    createRoot(() => {
      const [s, _set] = createSignal([1, 2, 3, 4]);
      const r = createMemo(indexArray(s, (v) => v() * 2));
      expect(r()).toEqual([2, 4, 6, 8]);
    });
  });

  it("show fallback", () => {
    createRoot(() => {
      const [s, set] = createSignal([1, 2, 3, 4]);
      const double = indexArray<number, number | string>(s, (v) => v() * 2, {
        fallback: () => "Empty",
      });
      const r = createMemo(double);
      expect(r()).toEqual([2, 4, 6, 8]);
      set([]);
      expect(r()).toEqual(["Empty"]);
      set([3, 4, 5]);
      expect(r()).toEqual([6, 8, 10]);
    });
  });

  it("updates item value signals when items change at same index", () => {
    createRoot(() => {
      const [s, set] = createSignal([1, 2, 3]);
      // Use createMemo to make the mapped result reactive to signal changes
      const r = createMemo(
        indexArray(s, (v) => {
          return createMemo(() => v() * 10);
        }),
      );
      expect(r().map((m) => m())).toEqual([10, 20, 30]);

      // Changing values at same positions updates via signals
      set([4, 5, 6]);
      expect(r().map((m) => m())).toEqual([40, 50, 60]);
    });
  });
});

describe("For component", () => {
  it("renders list items", () => {
    createRoot(() => {
      const [items] = createSignal(["a", "b", "c"]);
      const result = For({
        each: () => items(),
        children: (item: Accessor<string>) => ({
          type: "item",
          props: { v: item() },
        }),
      }) as unknown as () => any[];

      expect(result().map((el: JSXElement) => el.props.v)).toEqual([
        "a",
        "b",
        "c",
      ]);
    });
  });

  it("updates when list changes", () => {
    createRoot(() => {
      const a = { v: "a" };
      const b = { v: "b" };
      const c = { v: "c" };
      const d = { v: "d" };
      const [items, setItems] = createSignal([a, b, c, d]);

      const result = For({
        each: () => items(),
        children: (item: Accessor<{ v: string }>) => ({
          type: "item",
          props: { v: item().v },
        }),
      }) as unknown as () => any[];

      const vals = () => result().map((el: JSXElement) => el.props.v);

      expect(vals()).toEqual(["a", "b", "c", "d"]);

      // 1 missing
      setItems([b, c, d]);
      expect(vals()).toEqual(["b", "c", "d"]);

      // Restore
      setItems([a, b, c, d]);
      expect(vals()).toEqual(["a", "b", "c", "d"]);

      // 2 missing
      setItems([a, d]);
      expect(vals()).toEqual(["a", "d"]);

      setItems([a, b, c, d]);
      expect(vals()).toEqual(["a", "b", "c", "d"]);

      // All missing
      setItems([]);
      expect(vals()).toEqual([]);

      setItems([a, b, c, d]);
      expect(vals()).toEqual(["a", "b", "c", "d"]);
    });
  });

  it("handles swaps", () => {
    createRoot(() => {
      const a = { v: "a" };
      const b = { v: "b" };
      const c = { v: "c" };
      const d = { v: "d" };
      const [items, setItems] = createSignal([a, b, c, d]);

      const result = For({
        each: () => items(),
        children: (item: Accessor<{ v: string }>) => ({
          type: "item",
          props: { v: item().v },
        }),
      }) as unknown as () => any[];

      const vals = () => result().map((el: JSXElement) => el.props.v);

      setItems([b, a, c, d]);
      expect(vals()).toEqual(["b", "a", "c", "d"]);

      setItems([d, b, c, a]);
      expect(vals()).toEqual(["d", "b", "c", "a"]);
    });
  });

  it("handles rotations", () => {
    createRoot(() => {
      const a = { v: "a" };
      const b = { v: "b" };
      const c = { v: "c" };
      const d = { v: "d" };
      const [items, setItems] = createSignal([a, b, c, d]);

      const result = For({
        each: () => items(),
        children: (item: Accessor<{ v: string }>) => ({
          type: "item",
          props: { v: item().v },
        }),
      }) as unknown as () => any[];

      const vals = () => result().map((el: JSXElement) => el.props.v);

      setItems([b, c, d, a]);
      expect(vals()).toEqual(["b", "c", "d", "a"]);

      setItems([c, d, a, b]);
      expect(vals()).toEqual(["c", "d", "a", "b"]);

      setItems([d, a, b, c]);
      expect(vals()).toEqual(["d", "a", "b", "c"]);
    });
  });

  it("handles reversal", () => {
    createRoot(() => {
      const a = { v: "a" };
      const b = { v: "b" };
      const c = { v: "c" };
      const d = { v: "d" };
      const [items, setItems] = createSignal([a, b, c, d]);

      const result = For({
        each: () => items(),
        children: (item: Accessor<{ v: string }>) => ({
          type: "item",
          props: { v: item().v },
        }),
      }) as unknown as () => any[];

      const vals = () => result().map((el: JSXElement) => el.props.v);

      setItems([d, c, b, a]);
      expect(vals()).toEqual(["d", "c", "b", "a"]);
    });
  });

  it("handles full replace", () => {
    createRoot(() => {
      const [items, setItems] = createSignal([{ v: "a" }, { v: "b" }]);

      const result = For({
        each: () => items(),
        children: (item: Accessor<{ v: string }>) => ({
          type: "item",
          props: { v: item().v },
        }),
      }) as unknown as () => any[];

      const vals = () => result().map((el: JSXElement) => el.props.v);

      expect(vals()).toEqual(["a", "b"]);
      setItems([{ v: "x" }, { v: "y" }, { v: "z" }]);
      expect(vals()).toEqual(["x", "y", "z"]);
    });
  });

  it("renders fallback when empty", () => {
    createRoot(() => {
      const [items, setItems] = createSignal<string[]>([]);
      const empty = { type: "empty", props: { v: "Empty" } };
      const result = For({
        each: () => items(),
        children: (item: Accessor<string>) => ({
          type: "item",
          props: { v: item() },
        }),
        fallback: empty,
      }) as unknown as () => any[];

      expect(result()).toEqual([empty]);

      setItems(["a", "b"]);
      expect(result().map((el: JSXElement) => el.props.v)).toEqual(["a", "b"]);

      setItems([]);
      expect(result()).toEqual([empty]);
    });
  });

  it("passes reactive index accessor to children", () => {
    createRoot(() => {
      const a = { v: "a" };
      const b = { v: "b" };
      const c = { v: "c" };
      const [items, setItems] = createSignal([a, b, c]);

      // Use createMemo inside children to make index reactive
      const result = For({
        each: () => items(),
        children: (item: Accessor<{ v: string }>, index: Accessor<number>) =>
          createMemo(() => ({
            type: "item",
            props: { label: `${item().v}:${index()}` },
          })),
      }) as unknown as () => any[];

      expect(result().map((m: any) => m().props.label)).toEqual([
        "a:0",
        "b:1",
        "c:2",
      ]);

      setItems([c, a, b]);
      expect(result().map((m: any) => m().props.label)).toEqual([
        "c:0",
        "a:1",
        "b:2",
      ]);
    });
  });

  it("swap backward edge", () => {
    createRoot(() => {
      const milk = { v: "milk" };
      const bread = { v: "bread" };
      const chips = { v: "chips" };
      const cookie = { v: "cookie" };
      const honey = { v: "honey" };

      const [items, setItems] = createSignal([
        milk,
        bread,
        chips,
        cookie,
        honey,
      ]);
      const result = For({
        each: () => items(),
        children: (item: Accessor<{ v: string }>) => ({
          type: "item",
          props: { v: item().v },
        }),
      }) as unknown as () => any[];

      const vals = () => result().map((el: JSXElement) => el.props.v);

      expect(vals()).toEqual(["milk", "bread", "chips", "cookie", "honey"]);

      setItems([chips, bread, cookie, milk, honey]);
      expect(vals()).toEqual(["chips", "bread", "cookie", "milk", "honey"]);
    });
  });
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
            children: { type: "t", props: { v: `content:${item().id}` } },
            fallback: { type: "t", props: { v: `hidden:${item().id}` } },
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
              return createMemo(() => ({
                type: "t",
                props: { n: item().v * multiplier() },
              }));
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
            children: { type: "t", props: { v: `yes:${item().id}` } },
            fallback: { type: "t", props: { v: `no:${item().id}` } },
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
            children: createMemo(() => ({
              type: "t",
              props: { v: `${val()}:${inner()}` },
            })),
            fallback: { type: "t", props: { v: "inner-hidden" } },
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

      const bothVisible = { type: "t", props: { v: "both-visible" } };
      const innerHidden = { type: "t", props: { v: "inner-hidden" } };

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
              createMemo(() => ({
                type: "t",
                props: { label: `${val()}:${item().id}` },
              })),
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
            return { type: "item", props: { v: item().id } };
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
            return createMemo(() => ({
              type: "t",
              props: { label: `${item().id}:${item().v}` },
            }));
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
            return createMemo(() => ({
              type: "t",
              props: { label: `${item().v}${suffix()}` },
            }));
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

afterEach(() => {
  resetRuntime();
});

describe("signal write inside handler → For cascade", () => {
  it("signal write inside handler triggers For to mount new children", async () => {
    const handlerOrder: string[] = [];
    const [items, setItems] = createSignal<string[]>([]);

    function Parent() {
      useAsyncOutput(
        {},
        async (_p, setOutputs) => {
          handlerOrder.push("Parent");
          setItems(["a", "b", "c"]);
          setOutputs({ status: "ready" });
        },
      );
      return For({
        each: items,
        keyFn: (s: string) => s,
        children: (item: () => string) => (
          <Child name={item()} key={item()} />
        ),
      });
    }

    function Child(props: { name: string }) {
      useAsyncOutput(
        { name: props.name },
        async (p, setOutputs) => {
          handlerOrder.push(`Child:${p.name}`);
          setOutputs({ created: true });
        },
      );
      return <></>;
    }

    const mem = new InMemoryMemory();
    const result = render(
      () => <Parent key="p" />,
      mem,
      "test-signal-for",
    );

    await result.ready;
    await result.settled();

    // Parent ran, then 3 children should have cascaded
    expect(handlerOrder[0]).toBe("Parent");
    expect(handlerOrder).toContain("Child:a");
    expect(handlerOrder).toContain("Child:b");
    expect(handlerOrder).toContain("Child:c");
    expect(handlerOrder.length).toBe(4);

    // All 4 nodes should be in the tree
    const nodes = result.getNodes();
    expect(nodes.length).toBe(4);

    result.dispose();
  });

  it("setOutputs with Map value fires signal correctly", async () => {
    const handlerOrder: string[] = [];

    function Registry() {
      useAsyncOutput(
        {},
        async (_p, setOutputs) => {
          handlerOrder.push("Registry");
          setOutputs({
            files: new Map([
              ["a.ts", "console.log('a')"],
              ["b.ts", "console.log('b')"],
            ]),
          });
        },
      );
      return <></>;
    }

    const mem = new InMemoryMemory();
    const result = render(
      () => <Registry key="r" />,
      mem,
      "test-map-output",
    );

    await result.ready;
    await result.settled();

    expect(handlerOrder).toEqual(["Registry"]);

    const nodes = result.getNodes();
    expect(nodes.length).toBe(1);
    expect(nodes[0]!.outputs?.files).toBeInstanceOf(Map);
    expect((nodes[0]!.outputs?.files as Map<string, string>).size).toBe(2);

    result.dispose();
  });

  it("second setOutputs with different Map triggers signal update", async () => {
    let setOutputsRef: any = null;

    function Tracker() {
      useAsyncOutput(
        {},
        async (_p, setOutputs) => {
          setOutputsRef = setOutputs;
          setOutputs({ items: new Map([["x", 1]]) });
        },
      );
      return <></>;
    }

    const mem = new InMemoryMemory();
    const result = render(
      () => <Tracker key="t" />,
      mem,
      "test-map-update",
    );

    await result.ready;
    await result.settled();

    // Update with a different Map (should NOT be silently dropped)
    setOutputsRef({ items: new Map([["x", 1], ["y", 2]]) });

    await result.settled();

    const nodes = result.getNodes();
    expect((nodes[0]!.outputs?.items as Map<string, number>).size).toBe(2);
    expect((nodes[0]!.outputs?.items as Map<string, number>).get("y")).toBe(2);

    result.dispose();
  });
});
