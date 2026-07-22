import { describe, expect, it} from "vitest";
import { ErrorBoundary, createRoot, createSignal} from "../../index";

/**
 * ErrorBoundary control flow tests
 *
 * Since CReact doesn't render to DOM, we test the reactive accessor
 * returned by ErrorBoundary. Children must be passed as accessors
 * (functions) so that catchError can catch synchronous throws.
 */

describe("ErrorBoundary", () => {
  it("catches error and renders static fallback", () => {
    createRoot(() => {
      const fallback = { type: "err", props: { v: "Failed Miserably" } };
      const result = ErrorBoundary({
        fallback,
        children: () => {
          throw new Error("Failure");
        },
      }) as unknown as () => any;

      expect(result()).toBe(fallback);
    });
  });

  it("catches null error and renders static fallback", () => {
    createRoot(() => {
      const fallback = { type: "err", props: { v: "Failed Miserably" } };
      const result = ErrorBoundary({
        fallback,
        children: () => {
          throw null;
        },
      }) as unknown as () => any;

      // null !== undefined, so errored() is truthy in ErrorBoundary
      expect(result()).toBe(fallback);
    });
  });

  it("catches error with callback fallback", () => {
    createRoot(() => {
      const result = ErrorBoundary({
        fallback: (e: any, _reset: () => void) => ({ type: "err", props: { v: e.message } }),
        children: () => {
          throw new Error("Failure");
        },
      }) as unknown as () => any;

      expect(result().props.v).toBe("Failure");
    });
  });

  it("catches error with callback and reset", () => {
    createRoot(() => {
      let first = true;
      const success = { type: "ok", props: { v: "Success" } };

      let resetFn: () => void;
      const result = ErrorBoundary({
        fallback: (e: any, reset: () => void) => {
          resetFn = reset;
          return { type: "err", props: { v: e.message } };
        },
        children: () => {
          if (first) {
            first = false;
            throw new Error("Failure");
          }
          return success;
        },
      }) as unknown as () => any;

      expect(result().props.v).toBe("Failure");

      // Reset should clear the error and re-evaluate children
      resetFn!();
      expect(result()).toBe(success);
    });
  });

  it("renders children when no error", () => {
    createRoot(() => {
      const fallback = { type: "err", props: { v: "error" } };
      const success = { type: "ok", props: { v: "Success" } };
      const result = ErrorBoundary({
        fallback,
        children: success,
      }) as unknown as () => any;

      expect(result()).toBe(success);
    });
  });

  it("catches errors from reactive children", () => {
    createRoot(() => {
      const [shouldThrow, setShouldThrow] = createSignal(false);
      const ok = { type: "ok", props: { v: "ok" } };

      const result = ErrorBoundary({
        fallback: (e: any, _reset: () => void) =>
          ({ type: "err", props: { v: `Error: ${e.message}` } }),
        children: () => {
          if (shouldThrow()) throw new Error("reactive error");
          return ok;
        },
      }) as unknown as () => any;

      // Initially no error
      expect(result()).toBe(ok);

      // When signal changes to throw, error is caught
      setShouldThrow(true);
      expect(result().props.v).toBe("Error: reactive error");
    });
  });
});
