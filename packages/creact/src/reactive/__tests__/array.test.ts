import { describe, expect, it} from "vitest";
import { indexArray, mapArray} from "../array";
import { createRoot, onCleanup} from "../owner";
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
            index,
          }),
          { keyFn: (item) => item.id },
        ),
      );
      mapped();

      setItems([{ id: "a" }, { id: "b" }, { id: "c" }]);

      const rows = mapped();
      expect(rows.map((r: any) => r.id)).toEqual(["a", "b", "c"]);
      // Existing rows' index signals follow their new positions
      expect(rows.map((r: any) => r.index())).toEqual([0, 1, 2]);
      dispose();
    });
  });

  it("removing an item disposes only that row", () => {
    createRoot((dispose) => {
      const disposed: string[] = [];
      const [items, setItems] = createSignal([{ id: "x" }, { id: "y" }]);

      const mapped = createMemo(
        mapArray(
          items,
          (item) => {
            const id = item().id;
            onCleanup(() => disposed.push(id));
            return id;
          },
          { keyFn: (item) => item.id },
        ),
      );
      mapped();

      setItems([{ id: "y" }]);

      expect(mapped()).toEqual(["y"]);
      expect(disposed).toEqual(["x"]);
      dispose();
    });
  });

  it("a row created at a position whose old row moves away does not steal its bookkeeping", () => {
    // Regression: createRow used to write the fresh row's disposer into
    // the live state arrays at index j before the keyed pass reused the
    // old row at that index — disposing the moved row then killed the
    // fresh row instead
    createRoot((dispose) => {
      const disposed: string[] = [];
      const [items, setItems] = createSignal([{ id: "a" }, { id: "b" }]);

      const mapped = createMemo(
        mapArray(
          items,
          (item) => {
            const id = item().id;
            onCleanup(() => disposed.push(id));
            return id;
          },
          { keyFn: (item) => item.id },
        ),
      );
      mapped();

      // 'c' is created at index 0 while 'a' (old index 0) is reused at 1
      setItems([{ id: "c" }, { id: "a" }]);
      expect(mapped()).toEqual(["c", "a"]);
      expect(disposed).toEqual(["b"]); // only the dropped row

      // Dropping 'a' must dispose a's row — not c's clobbered slot
      setItems([{ id: "c" }]);
      expect(mapped()).toEqual(["c"]);
      expect(disposed).toEqual(["b", "a"]);
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
      const disposed: number[] = [];
      const [items, setItems] = createSignal(["a", "b", "c"]);

      const mapped = createMemo(
        indexArray(items, (item, i) => {
          onCleanup(() => disposed.push(i));
          return item();
        }),
      );
      expect(mapped()).toEqual(["a", "b", "c"]);

      setItems(["a"]);

      expect(mapped()).toEqual(["a"]);
      expect(disposed.sort()).toEqual([1, 2]);
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
