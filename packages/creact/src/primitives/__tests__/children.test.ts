import { describe, expect, it} from "vitest";
import { createRoot} from "../../reactive/owner";
import { createSignal} from "../../reactive/signal";
import { children} from "../children";

const element = (name: string) => ({ type: name, props: {} });

describe("children", () => {
  it("resolves a single element to itself", () => {
    createRoot(() => {
      const el = element("db");

      const resolved = children(() => el as any);

      expect(resolved()).toBe(el);
    });
  });

  it("calls nested zero-arg functions until a value is produced", () => {
    createRoot(() => {
      const el = element("cache");

      const resolved = children((() => () => () => el) as any);

      expect(resolved()).toBe(el);
    });
  });

  it("flattens nested arrays and lazy items into a single list", () => {
    createRoot(() => {
      const a = element("a");
      const b = element("b");
      const c = element("c");

      const resolved = children(() => [a, [b, () => c]] as any);

      expect(resolved()).toEqual([a, b, c]);
    });
  });

  it("re-resolves when the underlying signal changes", () => {
    createRoot(() => {
      const first = element("first");
      const second = element("second");
      const [current, setCurrent] = createSignal<any>(first);

      const resolved = children(() => current());
      expect(resolved()).toBe(first);

      setCurrent(second);

      expect(resolved()).toBe(second);
    });
  });

  it.each([
    { label: "an array stays an array", input: () => [element("x")], size: 1 },
    { label: "a single child is wrapped", input: () => element("y"), size: 1 },
    { label: "null becomes an empty list", input: () => null, size: 0 },
  ])("toArray: $label", ({ input, size }) => {
    createRoot(() => {
      const resolved = children(input as any);

      expect(resolved.toArray()).toHaveLength(size);
    });
  });
});
