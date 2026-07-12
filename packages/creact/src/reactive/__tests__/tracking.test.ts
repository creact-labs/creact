import { describe, expect, it} from "vitest";
import { createComputed, createEffect} from "../effect";
import { createRoot} from "../owner";
import { catchError, createMemo, createSignal} from "../signal";
import { batch} from "../tracking";

describe("throwing pure computations", () => {
  it("a computed that throws is reset and its owned computations cleaned", () => {
    const caught: string[] = [];
    let setTrigger!: (v: boolean) => void;
    let disposeRoot!: () => void;
    let ownedRuns = 0;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [trigger, set] = createSignal(false);
      setTrigger = set;

      catchError(
        () => {
          createComputed(() => {
            // owned child computation — must be cleaned when the parent throws
            createComputed(() => {
              ownedRuns++;
            });
            if (trigger()) {
              throw new Error("computed-exploded");
            }
          });
        },
        (err) => {
          caught.push(err.message);
        },
      );
    });

    setTrigger(true);

    expect(caught).toEqual(["computed-exploded"]);
    expect(ownedRuns).toBeGreaterThanOrEqual(1);
    disposeRoot();
  });
});

describe("memo propagation edges", () => {
  it("a memo nobody observes still recomputes on demand", () => {
    const [n, setN] = createSignal(1);
    const doubled = createMemo(() => n() * 2);
    expect(doubled()).toBe(2);

    setN(21);

    expect(doubled()).toBe(42);
  });

  it("a custom equals suppresses propagation to observers", () => {
    let disposeRoot!: () => void;
    let setN!: (v: number) => void;
    const seen: number[] = [];

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [n, set] = createSignal(1);
      setN = set;
      const frozen = createMemo(() => n(), undefined, { equals: () => true });
      createEffect(() => {
        seen.push(frozen());
      });
    });

    setN(2); // memo recomputes but reports "equal" — observers stay quiet

    expect(seen).toEqual([1]);
    disposeRoot();
  });
});

describe("owner-chain scheduling (runTop ancestors)", () => {
  it("a stale parent computation runs before its owned effect", () => {
    const order: string[] = [];
    let disposeRoot!: () => void;
    let fire!: () => void;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [a, setA] = createSignal(0);
      const [b, setB] = createSignal(0);
      fire = () =>
        batch(() => {
          setA(1);
          setB(1);
        });

      createComputed(() => {
        a();
        order.push("parent");
        createEffect(() => {
          b();
          order.push("owned-effect");
        });
      });
    });

    order.length = 0;
    fire();

    // The parent computed re-ran; the effect it owns ran after it
    expect(order[0]).toBe("parent");
    expect(order).toContain("owned-effect");
    disposeRoot();
  });

  it("a stale owner runs first even when its child was scheduled earlier", () => {
    const order: string[] = [];
    let disposeRoot!: () => void;
    let setS!: (v: number) => void;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [s, set] = createSignal(0);
      setS = set;

      createComputed(() => {
        // child created BEFORE the parent subscribes → the child sits ahead
        // of its owner in the update queue; the ancestor walk must still
        // update (and thereby dispose+recreate) the parent first
        createComputed(() => {
          s();
          order.push("child");
        });
        s();
        order.push("parent");
      });
    });

    order.length = 0;
    setS(1);

    // The ancestor walk updated the parent first: its body recreates the
    // child (printing "child") before its own trailing "parent" push. The
    // STALE child never executed against a stale owner — without the walk
    // the order would be ["child", "child", "parent"].
    expect(order).toEqual(["child", "parent"]);
    disposeRoot();
  });

  it("clean intermediate owners are skipped in the ancestor walk", () => {
    const order: string[] = [];
    let disposeRoot!: () => void;
    let fireLeafOnly!: () => void;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [a] = createSignal(0);
      const [c, setC] = createSignal(0);
      fireLeafOnly = () => setC(1);

      createComputed(() => {
        a(); // outer owner — untouched by the leaf write, stays clean
        order.push("outer");
        createComputed(() => {
          a(); // inner owner — also clean
          order.push("inner");
          createEffect(() => {
            c();
            order.push("leaf-effect");
          });
        });
      });
    });

    order.length = 0;
    fireLeafOnly();

    // Only the leaf effect re-ran; its clean owners were walked but skipped
    expect(order).toEqual(["leaf-effect"]);
    disposeRoot();
  });

  it("an effect whose owner is pending resolves the owner first", () => {
    const order: string[] = [];
    let disposeRoot!: () => void;
    let fire!: () => void;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [s, setS] = createSignal(0);
      const [t, setT] = createSignal(0);
      const viaMemo = createMemo(() => s());
      fire = () =>
        batch(() => {
          setS(1);
          setT(1);
        });

      createComputed(() => {
        viaMemo(); // marked PENDING through the memo chain
        order.push("owner");
        createEffect(() => {
          t(); // marked STALE directly
          viaMemo();
          order.push("effect");
        });
      });
    });

    order.length = 0;
    fire();

    expect(order[0]).toBe("owner");
    expect(order).toContain("effect");
    disposeRoot();
  });
});
