import { describe, expect, it} from "vitest";
import { indexArray, mapArray} from "../array";
import { createRoot} from "../owner";
import { createMemo, createSignal} from "../signal";

describe("mapArray with keys", () => {
  it("inserting an item in the middle keeps existing rows and their indexes", () => {
    createRoot((dispose) => {
      const [items, setItems] = createSignal([
        { id: "a" },
        { id: "c" },
      ]);

      const mapped = createMemo(
        mapArray(
          items,
          (item, index) => ({
            id: item().id,
            index: index(),
          }),
          { keyFn: (item) => item.id },
        ),
      );
      mapped();

      setItems([{ id: "a" }, { id: "b" }, { id: "c" }]);

      const rows = mapped();
      expect(rows.map((r: any) => r.id)).toEqual(["a", "b", "c"]);
      dispose();
    });
  });

  it("removing an item disposes only that row", () => {
    createRoot((dispose) => {
      const [items, setItems] = createSignal([{ id: "x" }, { id: "y" }]);

      const mapped = createMemo(
        mapArray(items, (item) => item().id, {
          keyFn: (item) => item.id,
        }),
      );
      mapped();

      setItems([{ id: "y" }]);

      expect(mapped()).toEqual(["y"]);
      dispose();
    });
  });
});

describe("empty and missing lists", () => {
  it.each([
    { label: "mapArray treats undefined as an empty list", helper: mapArray },
    { label: "indexArray treats undefined as an empty list", helper: indexArray },
  ])("$label", ({ helper }) => {
    createRoot((dispose) => {
      const [items] = createSignal<string[] | undefined>(undefined);

      const mapped = createMemo(
        (helper as typeof mapArray)(items, (item) => item()),
      );

      expect(mapped()).toEqual([]);
      dispose();
    });
  });

  it("a keyed, index-aware list resets all its bookkeeping when emptied", () => {
    createRoot((dispose) => {
      const [items, setItems] = createSignal<{ id: string }[]>([
        { id: "a" },
        { id: "b" },
      ]);

      const mapped = createMemo(
        mapArray(
          items,
          (item, index) => `${item().id}@${index()}`,
          { keyFn: (item) => item.id },
        ),
      );
      expect(mapped()).toEqual(["a@0", "b@1"]);

      setItems([]);
      expect(mapped()).toEqual([]);

      // refills cleanly after the reset
      setItems([{ id: "c" }]);
      expect(mapped()).toEqual(["c@0"]);
      dispose();
    });
  });
});

describe("indexArray", () => {
  it("shrinking the list disposes the rows beyond the new length", () => {
    createRoot((dispose) => {
      const [items, setItems] = createSignal(["a", "b", "c"]);

      const mapped = createMemo(indexArray(items, (item) => item()));
      expect(mapped()).toEqual(["a", "b", "c"]);

      setItems(["a"]);

      expect(mapped()).toEqual(["a"]);
      dispose();
    });
  });

  it("growing the list creates rows for the new tail", () => {
    createRoot((dispose) => {
      const [items, setItems] = createSignal(["a"]);

      const mapped = createMemo(indexArray(items, (item) => item()));
      expect(mapped()).toEqual(["a"]);

      setItems(["a", "b"]);

      expect(mapped()).toEqual(["a", "b"]);
      dispose();
    });
  });
});
