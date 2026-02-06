import { describe, expect, it } from "vitest";
import type { Accessor, JSXElement } from "../../src/index";
import {
  createMemo,
  createRoot,
  createSignal,
  For,
  indexArray,
  mapArray,
} from "../../src/index";

const h = (type: string, props: Record<string, any> = {}): JSXElement => ({
  type,
  props,
});

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
        children: (item: Accessor<string>) => h("item", { v: item() }),
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
        children: (item: Accessor<{ v: string }>) => h("item", { v: item().v }),
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
        children: (item: Accessor<{ v: string }>) => h("item", { v: item().v }),
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
        children: (item: Accessor<{ v: string }>) => h("item", { v: item().v }),
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
        children: (item: Accessor<{ v: string }>) => h("item", { v: item().v }),
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
        children: (item: Accessor<{ v: string }>) => h("item", { v: item().v }),
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
      const empty = h("empty", { v: "Empty" });
      const result = For({
        each: () => items(),
        children: (item: Accessor<string>) => h("item", { v: item() }),
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
          createMemo(() => h("item", { label: `${item().v}:${index()}` })),
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
        children: (item: Accessor<{ v: string }>) => h("item", { v: item().v }),
      }) as unknown as () => any[];

      const vals = () => result().map((el: JSXElement) => el.props.v);

      expect(vals()).toEqual(["milk", "bread", "chips", "cookie", "honey"]);

      setItems([chips, bread, cookie, milk, honey]);
      expect(vals()).toEqual(["chips", "bread", "cookie", "milk", "honey"]);
    });
  });
});
