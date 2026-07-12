import { describe, expect, it } from "vitest";
import { indexArray, mapArray } from "../src/reactive/array";
import { createRoot } from "../src/reactive/owner";
import { createMemo, createSignal } from "../src/reactive/signal";

describe("mapArray with keys", () => {
  it("inserting an item in the middle keeps existing rows and their indexes", () => {
    createRoot((dispose) => {
      const [items, setItems] = createSignal([
        { id: "a" },
        { id: "c" },
      ]);
      const createdFor: string[] = [];

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
