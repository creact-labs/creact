import { describe, expect, it, test, vi} from "vitest";
import { type Accessor, access, batch, catchError, createComputed, createContext, createEffect, createMemo, createReaction, createRenderEffect, createRoot, createSelector, createSignal, getOwner, on, onCleanup, onMount, runWithOwner, untrack, useContext} from "../../index";
import { setOwnerHandleError} from "../owner";
import { type Signal, peekSignal} from "../signal";
import { flushSync} from "../tracking";

describe("Create signals", () => {
  test("Create and read a Signal", () => {
    const [value] = createSignal(5);
    expect(value()).toBe(5);
  });
  test("Create and read a Signal with comparator", () => {
    const [value] = createSignal(5, { equals: (a, b) => a === b });
    expect(value()).toBe(5);
  });
  test("Create Signal with no initial value", () => {
    const [value] = createSignal<number>();
    expect(value()).toBeUndefined();
  });
  test("Create and read a Memo", () => {
    createRoot(() => {
      const memo = createMemo(() => "Hello");
      expect(memo()).toBe("Hello");
    });
  });
  test("Create and read a Memo with initial value", () => {
    createRoot(() => {
      const memo = createMemo((i) => `${i} John`, "Hello");
      expect(memo()).toBe("Hello John");
    });
  });
  test("Create onMount", () => {
    let temp: string;
    createRoot(() => {
      onMount(() => (temp = "impure"));
    });
    expect(temp!).toBe("impure");
  });
  test("Create a Effect with explicit deps", () => {
    let temp: string;
    createRoot(() => {
      const [sign] = createSignal("thoughts");
      const fn = on(sign, (v) => (temp = `impure ${v}`));
      createEffect(fn);
      createEffect(on(sign, (v) => (temp = `impure ${v}`)));
    });
    expect(temp!).toBe("impure thoughts");
  });
  test("Create a Effect with multiple explicit deps", () => {
    let temp: string;
    createRoot(() => {
      const [sign] = createSignal("thoughts");
      const [num] = createSignal(3);
      const fn = on([sign, num], (v) => (temp = `impure ${v[1]}`));
      createEffect(fn);
    });
    expect(temp!).toBe("impure 3");
  });
  test("Create a Effect with explicit deps and lazy evaluation", () => {
    let temp: string;
    const [sign, set] = createSignal("thoughts");
    createRoot(() => {
      const fn = on(sign, (v) => (temp = `impure ${v}`), { defer: true });
      createEffect(fn);
    });
    expect(temp!).toBeUndefined();
    set("minds");
    expect(temp!).toBe("impure minds");
  });
  test("Create a Effect with explicit deps, lazy evaluation, and initial value", () => {
    let temp: string;
    const [sign, set] = createSignal("thoughts");
    createRoot(() => {
      const fn = on(sign, (v, _, p) => (temp = `impure ${p} ${v}`), {
        defer: true,
      });
      createEffect(fn, "numbers");
    });
    expect(temp!).toBeUndefined();
    set("minds");
    expect(temp!).toBe("impure numbers minds");
  });
});

describe("Update signals", () => {
  test("Create and update a Signal", () => {
    const [value, setValue] = createSignal(5);
    setValue(10);
    expect(value()).toBe(10);
  });
  test("Create and update a Signal with fn", () => {
    const [value, setValue] = createSignal(5);
    setValue((p) => p + 5);
    expect(value()).toBe(10);
  });
  test("Create Signal and set different value", () => {
    const [value, setValue] = createSignal(5);
    setValue(10);
    expect(value()).toBe(10);
  });
  test("Create Signal and set equivalent value", () => {
    const [value, setValue] = createSignal(5, { equals: (a, b) => a > b });
    setValue(3);
    expect(value()).toBe(5);
  });
  test("Create and read a Signal with function value", () => {
    const [value, setValue] = createSignal<() => string>(() => "Hi");
    expect(value()()).toBe("Hi");
    setValue(() => () => "Hello");
    expect(value()()).toBe("Hello");
  });
  test("Create and trigger a Memo", () => {
    createRoot(() => {
      const [name, setName] = createSignal("John"),
        memo = createMemo(() => `Hello ${name()}`);
      expect(memo()).toBe("Hello John");
      setName("Jake");
      expect(memo()).toBe("Hello Jake");
    });
  });
  test("Create Signal and set equivalent value not trigger Memo", () => {
    createRoot(() => {
      const [name, setName] = createSignal("John", {
          equals: (_a, b) => b.startsWith("J"),
        }),
        memo = createMemo(() => `Hello ${name()}`);
      expect(name()).toBe("John");
      expect(memo()).toBe("Hello John");
      setName("Jake");
      expect(name()).toBe("John");
      expect(memo()).toBe("Hello John");
    });
  });
  test("Create and trigger a Memo in an effect", () =>
    new Promise((done) => {
      createRoot(() => {
        let temp: string;
        const [name, setName] = createSignal("John"),
          memo = createMemo(() => `Hello ${name()}`);
        createEffect(() => (temp = `${memo()}!!!`));
        setTimeout(() => {
          expect(temp).toBe("Hello John!!!");
          setName("Jake");
          expect(temp).toBe("Hello Jake!!!");
          done(undefined);
        });
      });
    }));
  test("Create and trigger an Effect", () =>
    new Promise((done) => {
      createRoot(() => {
        let temp: string;
        const [sign, setSign] = createSignal("thoughts");
        createEffect(() => (temp = `unpure ${sign()}`));
        setTimeout(() => {
          expect(temp).toBe("unpure thoughts");
          setSign("mind");
          expect(temp).toBe("unpure mind");
          done(undefined);
        });
      });
    }));
  test("Create and trigger an Effect with function signals", () =>
    new Promise((done) => {
      createRoot(() => {
        let temp: string;
        const [sign, setSign] = createSignal<() => string>(() => "thoughts");
        createEffect(() => (temp = `unpure ${sign()()}`));
        setTimeout(() => {
          expect(temp).toBe("unpure thoughts");
          setSign(() => () => "mind");
          expect(temp).toBe("unpure mind");
          done(undefined);
        });
      });
    }));
  test("Set signal returns argument", () => {
    const [_, setValue] = createSignal<number>();
    setValue(undefined as any);
    expect(_()).toBe(undefined);
    setValue(12);
    expect(_()).toBe(12);
  });
});

describe("Untrack signals", () => {
  test("Mute an effect", () =>
    new Promise((done) => {
      createRoot(() => {
        let temp: string;
        const [sign, setSign] = createSignal("thoughts");
        createEffect(() => (temp = `unpure ${untrack(sign)}`));
        setTimeout(() => {
          expect(temp).toBe("unpure thoughts");
          setSign("mind");
          expect(temp).toBe("unpure thoughts");
          done(undefined);
        });
      });
    }));
});

describe("Batching signals", () => {
  test("batch groups updates", () => {
    createRoot(() => {
      let count = 0;
      const [a, setA] = createSignal(0);
      const [b, setB] = createSignal(0);
      const memo = createMemo(() => {
        count++;
        return a() + b();
      });
      expect(memo()).toBe(0);
      expect(count).toBe(1);
      batch(() => {
        setA(1);
        setB(1);
      });
      expect(memo()).toBe(2);
      expect(count).toBe(2); // only one recomputation for both sets
    });
  });
  test("Mute an effect", () =>
    new Promise((done) => {
      createRoot(() => {
        let temp: string;
        const [sign, setSign] = createSignal("thoughts");
        createEffect(() => (temp = `unpure ${untrack(sign)}`));
        setTimeout(() => {
          expect(temp).toBe("unpure thoughts");
          setSign("mind");
          expect(temp).toBe("unpure thoughts");
          done(undefined);
        });
      });
    }));
});

describe("Effect grouping of signals", () => {
  test("Groups updates", () =>
    new Promise((done) => {
      createRoot(() => {
        let count = 0;
        const [a, setA] = createSignal(0);
        const [b, setB] = createSignal(0);
        createEffect(() => {
          setA(1);
          setB(1);
        });
        createMemo(() => (count += a() + b()));
        setTimeout(() => {
          expect(count).toBe(2);
          done(undefined);
        });
      });
    }));
  test("Groups updates with repeated sets", () =>
    new Promise((done) => {
      createRoot(() => {
        let count = 0;
        const [a, setA] = createSignal(0);
        createEffect(() => {
          setA(1);
          setA(4);
        });
        createMemo(() => (count += a()));
        setTimeout(() => {
          expect(count).toBe(4);
          done(undefined);
        });
      });
    }));
  test("Groups updates with fn setSignal", () =>
    new Promise((done) => {
      createRoot(() => {
        let count = 0;
        const [a, setA] = createSignal(0);
        const [b, setB] = createSignal(0);
        createEffect(() => {
          setA((a) => a + 1);
          setB((b) => b + 1);
        });
        createMemo(() => (count += a() + b()));
        setTimeout(() => {
          expect(count).toBe(2);
          done(undefined);
        });
      });
    }));
  test("Groups updates with fn setSignal with repeated sets", () =>
    new Promise((done) => {
      createRoot(() => {
        let count = 0;
        const [a, setA] = createSignal(0);
        createEffect(() => {
          setA((a) => a + 1);
          setA((a) => a + 2);
        });
        createMemo(() => (count += a()));
        setTimeout(() => {
          expect(count).toBe(3);
          done(undefined);
        });
      });
    }));
  test("Test cross setting in a effect update", () =>
    new Promise((done) => {
      createRoot(() => {
        let count = 0;
        const [a, setA] = createSignal(1);
        const [b, setB] = createSignal(0);
        createEffect(() => {
          setA((a) => a + b());
        });
        createMemo(() => (count += a()));
        setTimeout(() => {
          setB((b) => b + 1);
          setTimeout(() => {
            expect(count).toBe(3);
            done(undefined);
          });
        });
      });
    }));
  test("Handles errors gracefully", () =>
    new Promise((done) => {
      createRoot(() => {
        let error: Error;
        const [a, setA] = createSignal(0);
        const [b, _setB] = createSignal(0);
        createEffect(() => {
          try {
            setA(1);
            throw new Error("test");
          } catch (e) {
            error = e as Error;
          }
        });
        createMemo(() => a() + b());
        setTimeout(() => {
          expect(a()).toBe(1);
          expect(b()).toBe(0);
          setA(2);
          expect(a()).toBe(2);
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe("test");
          done(undefined);
        });
      });
    }));
  test("Multiple sets", () =>
    new Promise((done) => {
      createRoot(() => {
        let count = 0;
        const [a, setA] = createSignal(0);
        createEffect(() => {
          setA(1);
          setA(0);
        });
        createMemo(() => (count = a()));
        setTimeout(() => {
          expect(count).toBe(0);
          done(undefined);
        });
      });
    }));
});

describe("Typecheck computed and effects", () => {
  test("No default value can return undefined", () => {
    createRoot(() => {
      let count = 0;
      const [sign, setSign] = createSignal("thoughts");
      const fn = (arg?: number) => {
        count++;
        sign();
        expect(arg).toBe(undefined);
        return arg;
      };
      createComputed(fn);
      createRenderEffect(fn);
      createEffect(fn);
      setTimeout(() => {
        expect(count).toBe(3);
        setSign("update");
        expect(count).toBe(6);
      });
    });
  });
  test("Default value never receives undefined", () => {
    createRoot(() => {
      let count = 0;
      const [sign, setSign] = createSignal("thoughts");
      const fn = (arg: number) => {
        count++;
        sign();
        expect(arg).toBe(12);
        return arg;
      };
      createComputed(fn, 12);
      createRenderEffect(fn, 12);
      createEffect(fn, 12);
      setTimeout(() => {
        expect(count).toBe(3);
        setSign("update");
        expect(count).toBe(6);
      });
    });
  });
});

describe("onCleanup", () => {
  test("Clean an effect", () =>
    new Promise((done) => {
      createRoot(() => {
        let temp: string;
        const [sign, setSign] = createSignal("thoughts");
        createEffect(() => {
          sign();
          onCleanup(() => (temp = "after"));
        });
        setTimeout(() => {
          expect(temp).toBeUndefined();
          setSign("mind");
          expect(temp).toBe("after");
          done(undefined);
        });
      });
    }));
  test("Explicit root disposal", () => {
    let temp: string | undefined, disposer: () => void;
    createRoot((dispose) => {
      disposer = dispose;
      onCleanup(() => (temp = "disposed"));
    });
    expect(temp).toBeUndefined();
    disposer!();
    expect(temp).toBe("disposed");
  });
  test("Failed Root disposal from arguments", () => {
    let temp: string | undefined, disposer: () => void;
    createRoot((...args) => {
      disposer = args[0];
      onCleanup(() => (temp = "disposed"));
    });
    expect(temp).toBeUndefined();
    // With ...args, fn.length === 0 so root is unowned (UNOWNED sentinel).
    // Disposing an unowned root still runs cleanups registered on it.
    disposer!();
    expect(temp).toBe("disposed");
  });
  test("Cleanup runs in reverse order", () => {
    const order: number[] = [];
    createRoot((dispose) => {
      onCleanup(() => order.push(1));
      onCleanup(() => order.push(2));
      onCleanup(() => order.push(3));
      dispose();
    });
    expect(order).toEqual([3, 2, 1]);
  });
  test("warns when called outside root", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    onCleanup(() => {});
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("catchError", () => {
  test("No Handler", () => {
    expect(() =>
      createRoot(() => {
        throw "fail";
      }),
    ).toThrow("fail");
  });
  test("Top level", () => {
    let errored = false;
    expect(() =>
      createRoot(() => {
        catchError(
          () => {
            throw "fail";
          },
          () => (errored = true),
        );
      }),
    ).not.toThrow("fail");
    expect(errored).toBe(true);
  });
  test("Nested in catchError", () => {
    let errored = false;
    expect(() =>
      createRoot(() => {
        catchError(
          () => {
            catchError(
              () => {
                throw "fail";
              },
              (error) => {
                throw error;
              },
            );
          },
          () => (errored = true),
        );
      }),
    ).not.toThrow("fail");
    expect(errored).toBe(true);
  });
  test("In initial effect", () => {
    let errored = false;
    expect(() =>
      createRoot(() => {
        createEffect(() => {
          catchError(
            () => {
              throw "fail";
            },
            () => (errored = true),
          );
        });
      }),
    ).not.toThrow("fail");
    expect(errored).toBe(true);
  });
  test("In update effect", () => {
    let errored = false;
    expect(() =>
      createRoot(() => {
        const [s, set] = createSignal(0);
        createEffect(() => {
          const v = s();
          catchError(
            () => {
              if (v) throw "fail";
            },
            () => (errored = true),
          );
        });
        set(1);
      }),
    ).not.toThrow("fail");
    expect(errored).toBe(true);
  });
  test("In initial nested effect", () => {
    let errored = false;
    expect(() =>
      createRoot(() => {
        createEffect(() => {
          createEffect(() => {
            catchError(
              () => {
                throw "fail";
              },
              () => (errored = true),
            );
          });
        });
      }),
    ).not.toThrow("fail");
    expect(errored).toBe(true);
  });
  test("In nested update effect", () => {
    let errored = false;
    expect(() =>
      createRoot(() => {
        const [s, set] = createSignal(0);
        createEffect(() => {
          createEffect(() => {
            const v = s();
            catchError(
              () => {
                if (v) throw "fail";
              },
              () => (errored = true),
            );
          });
        });
        set(1);
      }),
    ).not.toThrow("fail");
    expect(errored).toBe(true);
  });
  test("In nested update effect different levels", () => {
    let errored = false;
    expect(() =>
      createRoot(() => {
        const [s, set] = createSignal(0);
        createEffect(() => {
          catchError(
            () =>
              createEffect(() => {
                const v = s();
                if (v) throw "fail";
              }),
            () => (errored = true),
          );
        });
        set(1);
      }),
    ).not.toThrow("fail");
    expect(errored).toBe(true);
  });
  test("In nested memo", () => {
    let errored = false;
    expect(() =>
      createRoot(() => {
        createMemo(() => {
          catchError(
            () => {
              createEffect(() => {});
              throw new Error("fail");
            },
            () => (errored = true),
          );
        });
      }),
    ).not.toThrow("fail");
    expect(errored).toBe(true);
  });
});

describe("createSelector", () => {
  test("simple selection", () =>
    new Promise((done) => {
      createRoot(() => {
        const [s, set] = createSignal<number>(),
          isSelected = createSelector(s);
        let count = 0;
        const list = Array.from({ length: 100 }, (_, i) =>
          createMemo(() => {
            count++;
            return isSelected(i) ? "selected" : "no";
          }),
        );
        expect(count).toBe(100);
        expect(list[3]!()).toBe("no");
        setTimeout(() => {
          count = 0;
          set(3);
          expect(count).toBe(1);
          expect(list[3]!()).toBe("selected");
          count = 0;
          set(6);
          expect(count).toBe(2);
          expect(list[3]!()).toBe("no");
          expect(list[6]!()).toBe("selected");
          set(undefined as any);
          expect(count).toBe(3);
          expect(list[6]!()).toBe("no");
          set(5);
          expect(count).toBe(4);
          expect(list[5]!()).toBe("selected");
          done(undefined);
        });
      });
    }));
  test("double selection", () =>
    new Promise((done) => {
      createRoot(() => {
        const [s, set] = createSignal<number>(-1),
          isSelected = createSelector<number, number>(s);
        let count = 0;
        const list = Array.from({ length: 100 }, (_, i) => [
          createMemo(() => {
            count++;
            return isSelected(i) ? "selected" : "no";
          }),
          createMemo(() => {
            count++;
            return isSelected(i) ? "oui" : "non";
          }),
        ]);
        expect(count).toBe(200);
        expect(list[3]![0]!()).toBe("no");
        expect(list[3]![1]!()).toBe("non");
        setTimeout(() => {
          count = 0;
          set(3);
          expect(count).toBe(2);
          expect(list[3]![0]!()).toBe("selected");
          expect(list[3]![1]!()).toBe("oui");
          count = 0;
          set(6);
          expect(count).toBe(4);
          expect(list[3]![0]!()).toBe("no");
          expect(list[6]![0]!()).toBe("selected");
          expect(list[3]![1]!()).toBe("non");
          expect(list[6]![1]!()).toBe("oui");
          done(undefined);
        });
      });
    }));
  test("zero index", () =>
    new Promise((done) => {
      createRoot(() => {
        const [s, set] = createSignal<number>(-1),
          isSelected = createSelector<number, number>(s);
        let count = 0;
        const list = [
          createMemo(() => {
            count++;
            return isSelected(0) ? "selected" : "no";
          }),
        ];
        expect(count).toBe(1);
        expect(list[0]!()).toBe("no");
        setTimeout(() => {
          count = 0;
          set(0);
          expect(count).toBe(1);
          expect(list[0]!()).toBe("selected");
          count = 0;
          set(-1);
          expect(count).toBe(1);
          expect(list[0]!()).toBe("no");
          done(undefined);
        });
      });
    }));
});

describe("create and use context", () => {
  test("createContext without arguments defaults to undefined", () => {
    const context = createContext<number>();
    const res = useContext(context);
    expect(res).toBe(undefined);
  });
});

describe("Memo chains", () => {
  test("diamond dependency", () => {
    createRoot(() => {
      const [s, set] = createSignal(1);
      const a = createMemo(() => s() * 2);
      const b = createMemo(() => s() * 3);
      const c = createMemo(() => a() + b());
      expect(c()).toBe(5);
      set(2);
      expect(c()).toBe(10);
    });
  });
  test("long chain", () => {
    createRoot(() => {
      const [s, set] = createSignal(0);
      const a = createMemo(() => s() + 1);
      const b = createMemo(() => a() + 1);
      const c = createMemo(() => b() + 1);
      const d = createMemo(() => c() + 1);
      expect(d()).toBe(4);
      set(10);
      expect(d()).toBe(14);
    });
  });
});

describe("access", () => {
  test("unwraps accessor function", () => {
    expect(access(() => 42)).toBe(42);
  });
  test("returns plain value", () => {
    expect(access(42)).toBe(42);
  });
  test("returns string value", () => {
    expect(access("hello")).toBe("hello");
  });
  test("returns null/undefined", () => {
    expect(access(null)).toBeNull();
    expect(access(undefined)).toBeUndefined();
  });
});

describe("Signal with equals: false", () => {
  test("always notifies observers", () => {
    createRoot(() => {
      let count = 0;
      const [s, set] = createSignal(0, { equals: false });
      createMemo(() => {
        s();
        count++;
      });
      expect(count).toBe(1);
      set(0); // same value
      expect(count).toBe(2);
    });
  });
});

describe("createRoot", () => {
  test("provides an owner", () => {
    createRoot((dispose) => {
      expect(getOwner()).not.toBeNull();
      dispose();
    });
  });
  test("returns value from fn", () => {
    const result = createRoot(() => 42);
    expect(result).toBe(42);
  });
  test("roots with dispose function unused are unowned", () => {
    createRoot((_) => {
      const root1 = getOwner()!;
      createRoot((_) => {
        const root2 = getOwner()!;
        createRoot(() => {
          const root3 = getOwner()!;
          expect(root2.owner).toBe(root1);
          expect(root3.owner).toBe(null);
        });
      });
    });
  });
  test("Allows to define detachedOwner", () => {
    let owner1: any;
    let owner2: any;
    let owner3: any;
    let owner4: any;
    let owner5: any;

    createRoot((_) => (owner1 = getOwner()!));
    createRoot((_) => (owner2 = getOwner()!), owner1);
    createRoot((_) => {
      owner3 = getOwner()!;
      createRoot((_) => (owner4 = getOwner()!));
      createRoot((_) => (owner5 = getOwner()!), null as any);
    });

    expect(owner1.owner).toBe(null);
    expect(owner2.owner).toBe(owner1);
    expect(owner3.owner).toBe(null);
    expect(owner4.owner).toBe(owner3);
    expect(owner5.owner).toBe(null);
  });
  test("owner is null outside createRoot", () => {
    expect(getOwner()).toBeNull();
  });
});

describe("runWithOwner", () => {
  test("Top level owner execute and disposal", () => {
    let effectRun = false;
    let cleanupRun = false;
    const [owner, dispose] = createRoot((dispose) => {
      return [getOwner()!, dispose];
    });

    runWithOwner(owner, () => {
      createEffect(() => (effectRun = true));
      onCleanup(() => (cleanupRun = true));
      expect(effectRun).toBe(false);
      expect(cleanupRun).toBe(false);
    });
    expect(effectRun).toBe(true);
    expect(cleanupRun).toBe(false);
    dispose();
    expect(cleanupRun).toBe(true);
  });
});

describe("createReaction", () => {
  test("Create and trigger a Reaction", () =>
    new Promise((done) => {
      createRoot(() => {
        let count = 0;
        const [sign, setSign] = createSignal("thoughts");
        const track = createReaction(() => count++);
        expect(count).toBe(0);
        track(sign);
        expect(count).toBe(0);
        setTimeout(() => {
          expect(count).toBe(0);
          setSign("mind");
          expect(count).toBe(1);
          setSign("body");
          expect(count).toBe(1);
          track(sign);
          setSign("everything");
          expect(count).toBe(2);
          done(undefined);
        });
      });
    }));
});

describe("createMemo", () => {
  describe("executing propagating", () => {
    it("propagates in topological order", () => {
      createRoot(() => {
        //
        //     c1
        //    /  \
        //   /    \
        //  b1     b2
        //   \    /
        //    \  /
        //     a1
        //
        let seq = "";
        const [a1, setA1] = createSignal(false);
        const b1 = createMemo(
          () => {
            a1();
            seq += "b1";
          },
          undefined,
          { equals: false },
        );
        const b2 = createMemo(
          () => {
            a1();
            seq += "b2";
          },
          undefined,
          { equals: false },
        );
        // reactive subscription: must execute to track b1/b2 and append to seq
        void createMemo(
          () => {
            b1();
            b2();
            seq += "c1";
          },
          undefined,
          { equals: false },
        );

        seq = "";
        setA1(true);

        expect(seq).toBe("b1b2c1");
      });
    });

    it("only propagates once with linear convergences", () => {
      createRoot(() => {
        //         d
        //         |
        // +---+---+---+---+
        // v   v   v   v   v
        // f1  f2  f3  f4  f5
        // |   |   |   |   |
        // +---+---+---+---+
        //         v
        //         g
        const [d, setD] = createSignal(0);
        const f1 = createMemo(() => d());
        const f2 = createMemo(() => d());
        const f3 = createMemo(() => d());
        const f4 = createMemo(() => d());
        const f5 = createMemo(() => d());
        let gcount = 0;
        // reactive subscription: must execute to track f1–f5 and count evaluations
        void createMemo(() => {
          gcount++;
          return f1() + f2() + f3() + f4() + f5();
        });

        gcount = 0;
        setD(1);
        expect(gcount).toBe(1);
      });
    });

    it("only propagates once with exponential convergence", () => {
      createRoot(() => {
        //     d
        //     |
        // +---+---+
        // v   v   v
        // f1  f2 f3
        //   \ | /
        //     O
        //   / | \
        // v   v   v
        // g1  g2  g3
        // +---+---+
        //     v
        //     h
        const [d, setD] = createSignal(0);
        const f1 = createMemo(() => d());
        const f2 = createMemo(() => d());
        const f3 = createMemo(() => d());
        const g1 = createMemo(() => f1() + f2() + f3());
        const g2 = createMemo(() => f1() + f2() + f3());
        const g3 = createMemo(() => f1() + f2() + f3());
        let hcount = 0;
        // reactive subscription: must execute to track g1–g3 and count evaluations
        void createMemo(() => {
          hcount++;
          return g1() + g2() + g3();
        });
        hcount = 0;
        setD(1);
        expect(hcount).toBe(1);
      });
    });

    it("does not trigger downstream computations unless changed", () => {
      createRoot(() => {
        const [s1, set] = createSignal(1, { equals: false });
        let order = "";
        const t1 = createMemo(() => {
          order += "t1";
          return s1();
        });
        createMemo(() => {
          order += "c1";
          t1();
        });
        expect(order).toBe("t1c1");
        order = "";
        set(1);
        expect(order).toBe("t1");
        order = "";
        set(2);
        expect(order).toBe("t1c1");
      });
    });

    it("applies updates to changed dependees in same order as createMemo", () => {
      createRoot(() => {
        const [s1, set] = createSignal(0);
        let order = "";
        const t1 = createMemo(() => {
          order += "t1";
          return s1() === 0;
        });
        createMemo(() => {
          order += "c1";
          return s1();
        });
        createMemo(() => {
          order += "c2";
          return t1();
        });

        expect(order).toBe("t1c1c2");
        order = "";
        set(1);
        expect(order).toBe("t1c2c1");
      });
    });

    it("updates downstream pending computations", () => {
      createRoot(() => {
        const [s1, set] = createSignal(0);
        const [s2] = createSignal(0);
        let order = "";
        const t1 = createMemo(() => {
          order += "t1";
          return s1() === 0;
        });
        createMemo(() => {
          order += "c1";
          return s1();
        });
        createMemo(() => {
          order += "c2";
          t1();
          createMemo(() => {
            order += "c2_1";
            return s2();
          });
        });
        order = "";
        set(1);
        expect(order).toBe("t1c2c2_1c1");
      });
    });
  });

  describe("with changing dependencies", () => {
    let i: () => boolean, setI: (v: boolean) => void;
    let t: () => number, setT: (v: number) => void;
    let e: () => number, setE: (v: number) => void;
    let fevals: number;
    let f: () => number;

    function init() {
      [i, setI] = createSignal<boolean>(true);
      [t, setT] = createSignal(1);
      [e, setE] = createSignal(2);
      fevals = 0;
      f = createMemo(() => {
        fevals++;
        return i() ? t() : e();
      });
      fevals = 0;
    }

    it("updates on active dependencies", () => {
      createRoot(() => {
        init();
        setT(5);
        expect(fevals).toBe(1);
        expect(f()).toBe(5);
      });
    });

    it("does not update on inactive dependencies", () => {
      createRoot(() => {
        init();
        setE(5);
        expect(fevals).toBe(0);
        expect(f()).toBe(1);
      });
    });

    it("deactivates obsolete dependencies", () => {
      createRoot(() => {
        init();
        setI(false);
        fevals = 0;
        setT(5);
        expect(fevals).toBe(0);
      });
    });

    it("activates new dependencies", () => {
      createRoot(() => {
        init();
        setI(false);
        fevals = 0;
        setE(5);
        expect(fevals).toBe(1);
      });
    });

    it("ensures that new dependencies are updated before dependee", () => {
      createRoot(() => {
        let order = "";
        const [a, setA] = createSignal(0);
        const b = createMemo(() => {
          order += "b";
          return a() + 1;
        });
        const c = createMemo(() => {
          order += "c";
          const check = b();
          if (check) {
            return check;
          }
          return e();
        });
        const d = createMemo(() => {
          return a();
        });
        // biome-ignore lint/correctness/noUnusedVariables: e is captured by c's closure above
        const e = createMemo(() => {
          order += "d";
          return d() + 10;
        });

        expect(order).toBe("bcd");

        order = "";
        setA(-1);

        expect(order).toBe("bcd");
        expect(c()).toBe(9);

        order = "";
        setA(0);

        expect(order).toBe("bcd");
        expect(c()).toBe(1);
      });
    });
  });

  describe("with intercepting computations", () => {
    it("does not update subsequent pending computations after stale invocations", () => {
      createRoot(() => {
        const [s1, set1] = createSignal(1);
        const [s2, set2] = createSignal(false);
        let count = 0;
        /*
                    s1
                    |
                +---+---+
               t1 t2 c1 t3
                \       /
                   c3
             [PN,PN,STL,void]
        */
        const t1 = createMemo(() => s1() > 0);
        const t2 = createMemo(() => s1() > 0);
        const c1 = createMemo(() => s1());
        const t3 = createMemo(() => {
          const a = s1();
          const b = s2();
          return a && b;
        });
        createMemo(() => {
          t1();
          t2();
          c1();
          t3();
          count++;
        });
        set2(true);
        expect(count).toBe(2);
        set1(2);
        expect(count).toBe(3);
      });
    });

    it("evaluates stale computations before dependees when trackers stay unchanged", () => {
      createRoot(() => {
        const [s1, set] = createSignal(1, { equals: false });
        let order = "";
        const t1 = createMemo(() => {
          order += "t1";
          return s1() > 2;
        });
        const t2 = createMemo(() => {
          order += "t2";
          return s1() > 2;
        });
        const c1 = createMemo(
          () => {
            order += "c1";
            s1();
          },
          undefined,
          { equals: false },
        );
        createMemo(() => {
          order += "c2";
          t1();
          t2();
          c1();
        });
        order = "";
        set(1);
        expect(order).toBe("t1t2c1c2");
        order = "";
        set(3);
        expect(order).toBe("t2c2t1c1");
      });
    });

    it("evaluates nested trackings", () => {
      createRoot(() => {
        const [s1, set1] = createSignal(1);
        const [s2] = createSignal(1);
        let count = 0;
        let c1: () => number;
        createMemo(() => {
          c1 = createMemo(() => s2());
          return s1();
        });
        createMemo(() => {
          count++;
          c1();
        });
        set1(2);
        expect(count).toBe(1);
      });
    });

    it("propagates in topological order", () => {
      createRoot(() => {
        const [s1, set] = createSignal(true);
        let order = "";
        const t1 = createMemo(() => {
          order += "t1";
          return s1();
        });
        const t2 = createMemo(() => {
          order += "t2";
          return s1();
        });
        createMemo(() => {
          t1();
          t2();
          order += "c1";
        });
        order = "";
        set(false);
        expect(order).toBe("t1t2c1");
      });
    });

    it("does not evaluate dependencies with tracking sources that have not changed", () => {
      createRoot(() => {
        const [s1, set] = createSignal(1);
        let order = "";
        let c2: () => boolean;
        createMemo(() => {
          order += "c1";
          if (s1() > 1) {
            c2();
          }
        });
        const t1 = createMemo(() => {
          order += "t1";
          return s1() < 3;
        });
        const t2 = createMemo(() => {
          order += "t2";
          return t1();
        });
        c2 = createMemo(() => {
          order += "c2";
          return t2();
        });
        order = "";
        set(2);
        expect(order).toBe("c1t1");
        order = "";
        set(3);
        expect(order).toBe("c1t1t2c2");
      });
    });

    it("correctly marks downstream computations as stale on change", () => {
      createRoot(() => {
        const [s1, set] = createSignal(1);
        let order = "";
        const t1 = createMemo(() => {
          order += "t1";
          return s1();
        });
        const c1 = createMemo(() => {
          order += "c1";
          return t1();
        });
        const c2 = createMemo(() => {
          order += "c2";
          return c1();
        });
        createMemo(() => {
          order += "c3";
          return c2();
        });
        order = "";
        set(2);
        expect(order).toBe("t1c1c2c3");
      });
    });
  });

  describe("with unending changes", () => {
    it("throws when continually setting a direct dependency", () => {
      createRoot(() => {
        const [d, set] = createSignal(1);

        expect(() => {
          createMemo(() => {
            return set(d() + 1);
          });
        }).toThrow();
      });
    });

    it("throws when continually setting an indirect dependency", () => {
      createRoot(() => {
        let i = 2;
        const [d, set] = createSignal(1),
          f1 = createMemo(() => d()),
          f2 = createMemo(() => f1()),
          f3 = createMemo(() => f2());

        expect(() => {
          createMemo(() => {
            f3();
            set(i++);
          });
        }).toThrow();
      });
    });
  });

  describe("with circular dependencies", () => {
    it("throws when cycle created by modifying a branch", () => {
      createRoot(() => {
        var [d, set] = createSignal(1),
          f: Accessor<number | undefined> = createMemo(
            () => (f ? f() : d()),
            undefined,
            {
              equals: false,
            },
          );

        expect(() => {
          set(0);
        }).toThrow();
      });
    });
  });
});

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

describe("catchError", () => {
  it("normalizes non-Error values thrown inside effects", () => {
    const caught: Error[] = [];
    let setTrigger!: (v: boolean) => void;
    let disposeRoot!: () => void;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const [trigger, set] = createSignal(false);
      setTrigger = set;
      catchError(
        () => {
          createEffect(() => {
            if (trigger()) {
              // eslint-disable-next-line no-throw-literal
              throw "not-an-error";
            }
          });
        },
        (err) => {
          caught.push(err);
        },
      );
    });

    setTrigger(true);

    expect(caught[0]).toBeInstanceOf(Error);
    expect(caught[0]?.message).toBe("not-an-error");
    disposeRoot();
  });

  it("catches synchronous Error instances directly", () => {
    let caught: Error | undefined;

    catchError(
      () => {
        throw new Error("sync-error");
      },
      (err) => {
        caught = err;
      },
    );

    expect(caught?.message).toBe("sync-error");
  });
});
