import { describe, expect, it} from "vitest";
import { Match, Switch, createMemo, createRoot, createSignal} from "../../index";

/**
 * Switch/Match control flow tests
 *
 * Since CReact doesn't render to DOM, we test the reactive accessor
 * returned by Switch. The accessor evaluates to the first truthy
 * Match's children, or fallback.
 */

describe("Switch", () => {
  describe("single match", () => {
    it("renders fallback when no match", () => {
      createRoot(() => {
        const [count] = createSignal(0);
        const fallback = { type: "fb", props: { v: "fallback" } };
        const one = { type: "t", props: { v: "one" } };
        const result = Switch({
          fallback,
          children: [
            Match({
              when: () => Boolean(count()) && count() < 2,
              children: one,
            }),
          ],
        }) as unknown as () => any;

        expect(result()).toBe(fallback);
      });
    });

    it("toggles between match and fallback", () => {
      createRoot(() => {
        const [count, setCount] = createSignal(0);
        const fallback = { type: "fb", props: { v: "fallback" } };
        const one = { type: "t", props: { v: "one" } };
        const result = Switch({
          fallback,
          children: [
            Match({
              when: () => Boolean(count()) && count() < 2,
              children: one,
            }),
          ],
        }) as unknown as () => any;

        expect(result()).toBe(fallback);
        setCount(1);
        expect(result()).toBe(one);
        setCount(3);
        expect(result()).toBe(fallback);
      });
    });
  });

  describe("multiple matches", () => {
    it("renders first truthy match", () => {
      createRoot(() => {
        const [count, setCount] = createSignal(0);
        const fallback = { type: "fb", props: { v: "fallback" } };
        const one = { type: "t", props: { v: "one" } };
        const two = { type: "t", props: { v: "two" } };
        const three = { type: "t", props: { v: "three" } };
        const result = Switch({
          fallback,
          children: [
            Match({
              when: () => Boolean(count()) && count() < 2,
              children: one,
            }),
            Match({
              when: () => Boolean(count()) && count() < 5,
              children: two,
            }),
            Match({
              when: () => Boolean(count()) && count() < 8,
              children: three,
            }),
          ],
        }) as unknown as () => any;

        expect(result()).toBe(fallback);
        setCount(1);
        expect(result()).toBe(one);
        setCount(4);
        expect(result()).toBe(two);
        setCount(7);
        expect(result()).toBe(three);
        setCount(9);
        expect(result()).toBe(fallback);
      });
    });

    it("does not re-render on same matched option", () => {
      createRoot(() => {
        const [count, setCount] = createSignal(4);
        const fallback = { type: "fb", props: { v: "fallback" } };
        const matched = { type: "t", props: { v: "matched" } };
        const result = Switch({
          fallback,
          children: [
            Match({
              when: () => Boolean(count()) && count() < 5,
              children: matched,
            }),
          ],
        }) as unknown as () => any;

        expect(result()).toBe(matched);

        // Same truthiness — should still be matched
        setCount(3);
        expect(result()).toBe(matched);
      });
    });
  });

  describe("priority ordering (static children)", () => {
    it("higher priority match takes precedence", () => {
      createRoot(() => {
        const [a, setA] = createSignal(0);
        const [b, setB] = createSignal(0);
        const [c, setC] = createSignal(0);

        const fallback = { type: "fb", props: { v: "fallback" } };
        const aEl = { type: "t", props: { v: "a" } };
        const bEl = { type: "t", props: { v: "b" } };
        const cEl = { type: "t", props: { v: "c" } };

        const result = Switch({
          fallback,
          children: [
            Match({ when: () => a(), children: aEl }),
            Match({ when: () => b(), children: bEl }),
            Match({ when: () => c(), children: cEl }),
          ],
        }) as unknown as () => any;

        expect(result()).toBe(fallback);

        setC(1);
        expect(result()).toBe(cEl);

        setB(2);
        expect(result()).toBe(bEl);

        setA(3);
        expect(result()).toBe(aEl);

        setA(0);
        expect(result()).toBe(bEl);
      });
    });
  });

  describe("function children (non-keyed)", () => {
    it("passes accessor to function children", () => {
      createRoot(() => {
        const [a, setA] = createSignal(0);
        const [b, setB] = createSignal(0);
        const [c, setC] = createSignal(0);

        const fallback = { type: "fb", props: { v: "fallback" } };
        const result = Switch({
          fallback,
          children: [
            Match({
              when: () => a(),
              children: (val: () => number) =>
                createMemo(() => ({ type: "m", props: { v: `a=${val()}` } })),
            }),
            Match({
              when: () => b(),
              children: (val: () => number) =>
                createMemo(() => ({ type: "m", props: { v: `b=${val()}` } })),
            }),
            Match({
              when: () => c(),
              children: (val: () => number) =>
                createMemo(() => ({ type: "m", props: { v: `c=${val()}` } })),
            }),
          ],
        }) as unknown as () => any;

        expect(result()).toBe(fallback);

        setC(1);
        expect(result()().props.v).toBe("c=1");

        setB(2);
        expect(result()().props.v).toBe("b=2");

        setA(3);
        expect(result()().props.v).toBe("a=3");

        setA(0);
        expect(result()().props.v).toBe("b=2");
      });
    });
  });

  describe("zero-argument accessor children", () => {
    it("evaluates accessor children like reactive fallbacks, not returning the raw function", () => {
      createRoot(() => {
        const view = { type: "view", props: { v: "rendered" } };
        const result = Switch({
          children: Match({
            when: true,
            // CReactNode includes () => CReactNode — a valid child
            children: () => view,
          }),
        }) as unknown as () => any;

        expect(result()).toBe(view);
        expect(typeof result()).not.toBe("function");
      });
    });

    it("accessor children re-evaluate when their dependencies change", () => {
      createRoot(() => {
        const [label, setLabel] = createSignal("first");
        const result = Switch({
          children: Match({
            when: true,
            children: () => ({ type: "view", props: { v: label() } }),
          }),
        }) as unknown as () => any;

        expect(result().props.v).toBe("first");

        setLabel("second");
        expect(result().props.v).toBe("second");
      });
    });
  });

  describe("condition evaluation counts", () => {
    it("only evaluates conditions up to the first truthy match", () => {
      createRoot(() => {
        let aCount = 0;
        let bCount = 0;
        let cCount = 0;
        const [a, setA] = createSignal(0);
        const [b, _setB] = createSignal(0);
        const [c, setC] = createSignal(0);

        const fallback = { type: "fb", props: { v: "fallback" } };
        const aEl = { type: "t", props: { v: "a" } };
        const bEl = { type: "t", props: { v: "b" } };
        const cEl = { type: "t", props: { v: "c" } };

        const result = Switch({
          fallback,
          children: [
            Match({
              when: () => {
                aCount++;
                return a();
              },
              children: aEl,
            }),
            Match({
              when: () => {
                bCount++;
                return b();
              },
              children: bEl,
            }),
            Match({
              when: () => {
                cCount++;
                return c();
              },
              children: cEl,
            }),
          ],
        }) as unknown as () => any;

        expect(result()).toBe(fallback);
        expect(aCount).toBe(1);
        expect(bCount).toBe(1);
        expect(cCount).toBe(1);

        // Set c truthy
        setC(5);
        expect(result()).toBe(cEl);

        // Set a truthy — should match a, not re-evaluate b/c
        setA(1);
        expect(result()).toBe(aEl);

        // Set a falsy — should fall through to check b, then c
        setA(0);
        expect(result()).toBe(cEl);
      });
    });
  });

  describe("with reactive fallback", () => {
    it("supports accessor fallback", () => {
      createRoot(() => {
        const [status, setStatus] = createSignal("loading");
        const result = Switch({
          fallback: () => ({ type: "fb", props: { v: `status: ${status()}` } }),
          children: [],
        }) as unknown as () => any;

        expect(result().props.v).toBe("status: loading");
        setStatus("idle");
        expect(result().props.v).toBe("status: idle");
      });
    });
  });
});

describe("JSX Match elements", () => {
  it("resolves raw <Match> elements created by the JSX runtime", () => {
    createRoot(() => {
      const [mode, setMode] = createSignal("a");
      const fallback = { type: "fb", props: { v: "fallback" } };
      const aEl = { type: "t", props: { v: "a" } };
      const bEl = { type: "t", props: { v: "b" } };

      const result = Switch({
        fallback,
        children: [
          <Match when={() => mode() === "a"}>{aEl}</Match>,
          <Match when={() => mode() === "b"}>{bEl}</Match>,
        ] as any,
      }) as unknown as () => any;

      expect(result()).toBe(aEl);
      setMode("b");
      expect(result()).toBe(bEl);
      setMode("c");
      expect(result()).toBe(fallback);
    });
  });

  it("resolves a single raw <Match> element child", () => {
    createRoot(() => {
      const matched = { type: "t", props: { v: "matched" } };
      const result = Switch({
        children: (<Match when={true}>{matched}</Match>) as any,
      }) as unknown as () => any;

      expect(result()).toBe(matched);
    });
  });

  it("ignores null and non-match children mixed into the array", () => {
    createRoot(() => {
      const fallback = { type: "fb", props: { v: "fallback" } };
      const stray = { type: "div", props: { v: "stray" } };
      const matched = { type: "t", props: { v: "matched" } };

      const result = Switch({
        fallback,
        children: [
          null,
          stray,
          <Match when={true}>{matched}</Match>,
        ] as any,
      }) as unknown as () => any;

      expect(result()).toBe(matched);
    });
  });
});

describe("Switch children normalization", () => {
  it("accepts a single Match child (not wrapped in an array)", () => {
    const matched = { type: "matched", props: {} };
    const only = Match({ when: true, children: matched });

    const result = Switch({ children: only }) as unknown as () => any;

    expect(result()).toBe(matched);
  });

  it("renders the fallback when given no Match children at all", () => {
    const fallback = { type: "fallback", props: {} };
    const result = Switch({
      children: null as any,
      fallback,
    }) as unknown as () => any;

    expect(result()).toBe(fallback);
  });
});
