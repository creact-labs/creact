import { describe, expect, it, vi } from "vitest";
import {
  createEffect,
  createReaction,
  onCleanup as effectOnCleanup,
} from "../src/reactive/effect";
import {
  createRoot,
  onCleanup as ownerOnCleanup,
  runWithOwner,
  setOwnerHandleError,
} from "../src/reactive/owner";
import { createSelector } from "../src/reactive/selector";
import {
  catchError,
  createMemo,
  createSignal,
  peekSignal,
  type Signal,
} from "../src/reactive/signal";
import { flushSync } from "../src/reactive/tracking";

describe("error routing through owners", () => {
  it("runWithOwner routes thrown errors to the registered handler", () => {
    const seen: unknown[] = [];
    setOwnerHandleError((err) => {
      seen.push(err);
    });
    try {
      const value = runWithOwner(null, () => {
        throw new Error("inside-owner");
      });

      expect(value).toBeUndefined();
      expect(seen).toHaveLength(1);
      expect((seen[0] as Error).message).toBe("inside-owner");
    } finally {
      // restore rethrow behavior for other tests
      setOwnerHandleError((err) => {
        throw err;
      });
    }
  });

  it("runWithOwner returns the value on success", () => {
    expect(runWithOwner(null, () => "result")).toBe("result");
  });

  it("an error boundary whose handler throws escalates to the outer boundary", () => {
    const outerCaught: string[] = [];
    let setTrigger!: (v: boolean) => void;
    let disposeRoot!: () => void;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [trigger, set] = createSignal(false);
      setTrigger = set;

      catchError(
        () => {
          catchError(
            () => {
              createEffect(() => {
                if (trigger()) throw new Error("effect-blew-up");
              });
            },
            () => {
              throw new Error("inner-handler-also-blew-up");
            },
          );
        },
        (err) => {
          outerCaught.push(err.message);
        },
      );
    });

    setTrigger(true);

    expect(outerCaught).toEqual(["inner-handler-also-blew-up"]);
    disposeRoot();
  });

  it("catchError normalizes non-Error throws", () => {
    let caught: Error | undefined;

    catchError(
      () => {
        throw "plain-string";
      },
      (err) => {
        caught = err;
      },
    );

    expect(caught).toBeInstanceOf(Error);
    expect(caught?.message).toBe("plain-string");
  });
});

describe("owner-level cleanups", () => {
  it("warns when registered outside a reactive root", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      ownerOnCleanup(() => {});
      effectOnCleanup(() => {});

      expect(warnSpy).toHaveBeenCalledTimes(2);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("run in reverse order on dispose and survive a throwing cleanup", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const order: string[] = [];
    try {
      createRoot((dispose) => {
        ownerOnCleanup(() => order.push("first"));
        ownerOnCleanup(() => {
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

describe("reactive primitives without an owner", () => {
  it("createMemo works standalone (no root)", () => {
    const [n, setN] = createSignal(2);
    const doubled = createMemo(() => n() * 2);

    expect(doubled()).toBe(4);
    setN(5);
    expect(doubled()).toBe(10);
  });

  it("createEffect works standalone (no root)", () => {
    const [n, setN] = createSignal(1);
    const seen: number[] = [];

    createEffect(() => {
      seen.push(n());
    });
    setN(2);

    expect(seen).toEqual([1, 2]);
  });

  it("render-flagged effects run immediately instead of queueing as user effects", () => {
    const [n] = createSignal(7);
    let observed: number | undefined;

    createEffect(
      () => {
        observed = n();
        return undefined;
      },
      undefined,
      { render: true },
    );

    expect(observed).toBe(7);
  });
});

describe("selector-driven effects", () => {
  it("only the affected rows re-run when the selection moves", () => {
    const log: string[] = [];
    let setSelected!: (v: number) => void;
    let disposeRoot!: () => void;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [selected, set] = createSignal(1);
      setSelected = set;
      const isSelected = createSelector(selected);

      for (const id of [1, 2, 3]) {
        createEffect(() => {
          log.push(`${id}:${isSelected(id)}`);
        });
      }
    });

    log.length = 0; // ignore initial runs
    setSelected(3);

    expect(log.sort()).toEqual(["1:false", "3:true"]);
    disposeRoot();
  });
});

describe("small utilities", () => {
  it("peekSignal reads the raw value without tracking", () => {
    const signal: Signal<number> = {
      value: 99,
      observers: null,
      observerSlots: null,
    };

    expect(peekSignal(signal)).toBe(99);
  });

  it("flushSync resolves", async () => {
    await expect(flushSync()).resolves.toBeUndefined();
  });

  it("createReaction fires once per arming", () => {
    const [n, setN] = createSignal(0);
    let fires = 0;
    const track = createReaction(() => {
      fires++;
    });

    track(() => n());
    setN(1); // fires
    setN(2); // not armed anymore — silent

    expect(fires).toBe(1);
  });
});
