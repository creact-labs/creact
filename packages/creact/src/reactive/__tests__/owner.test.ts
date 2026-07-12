import { describe, expect, it, vi} from "vitest";
import { createStore} from "../../store/store";
import { createEffect} from "../effect";
import { createRoot, onCleanup, runWithOwner} from "../owner";

describe("errors with no boundary router registered", () => {
  it("a throwing effect propagates the original error to the writer", () => {
    let setCount!: (key: "count", value: number) => void;
    createRoot((dispose) => {
      const [state, setState] = createStore({ count: 0 });
      setCount = setState;
      createEffect(() => {
        if (state.count > 0) {
          throw new Error("effect-without-boundary");
        }
      });
      // keep dispose referenced so createRoot allocates a real owner
      void dispose;
    });

    expect(() => setCount("count", 1)).toThrow("effect-without-boundary");
  });

  it("runWithOwner rethrows when no handler was ever registered", () => {
    expect(() =>
      runWithOwner(null, () => {
        throw new Error("unrouted");
      }),
    ).toThrow("unrouted");
  });
});

describe("owner-level cleanups", () => {
  it("warns when registered outside a reactive root", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const fn = () => {};

      const returned = onCleanup(fn);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(returned).toBe(fn); // chaining contract
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("run in reverse order on dispose and survive a throwing cleanup", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const order: string[] = [];
    try {
      createRoot((dispose) => {
        onCleanup(() => order.push("first"));
        onCleanup(() => {
          order.push("second");
          throw new Error("cleanup-explosion");
        });
        dispose();
      });

      expect(order).toEqual(["second", "first"]);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error in cleanup"),
        expect.any(Error),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
