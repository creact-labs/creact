import { describe, expect, it } from "vitest";
import type { JSXElement } from "../../src/index";
import {
  createMemo,
  createRoot,
  createSignal,
  Match,
  Switch,
} from "../../src/index";

const h = (type: string, props: Record<string, any> = {}): JSXElement => ({
  type,
  props,
});

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
        const fallback = h("fb", { v: "fallback" });
        const one = h("t", { v: "one" });
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
        const fallback = h("fb", { v: "fallback" });
        const one = h("t", { v: "one" });
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
        const fallback = h("fb", { v: "fallback" });
        const one = h("t", { v: "one" });
        const two = h("t", { v: "two" });
        const three = h("t", { v: "three" });
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
        const fallback = h("fb", { v: "fallback" });
        const matched = h("t", { v: "matched" });
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

        const fallback = h("fb", { v: "fallback" });
        const aEl = h("t", { v: "a" });
        const bEl = h("t", { v: "b" });
        const cEl = h("t", { v: "c" });

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

        const fallback = h("fb", { v: "fallback" });
        const result = Switch({
          fallback,
          children: [
            Match({
              when: () => a(),
              children: (val: () => number) =>
                createMemo(() => h("m", { v: `a=${val()}` })),
            }),
            Match({
              when: () => b(),
              children: (val: () => number) =>
                createMemo(() => h("m", { v: `b=${val()}` })),
            }),
            Match({
              when: () => c(),
              children: (val: () => number) =>
                createMemo(() => h("m", { v: `c=${val()}` })),
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

  describe("condition evaluation counts", () => {
    it("only evaluates conditions up to the first truthy match", () => {
      createRoot(() => {
        let aCount = 0;
        let bCount = 0;
        let cCount = 0;
        const [a, setA] = createSignal(0);
        const [b, _setB] = createSignal(0);
        const [c, setC] = createSignal(0);

        const fallback = h("fb", { v: "fallback" });
        const aEl = h("t", { v: "a" });
        const bEl = h("t", { v: "b" });
        const cEl = h("t", { v: "c" });

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
          fallback: () => h("fb", { v: `status: ${status()}` }),
          children: [],
        }) as unknown as () => any;

        expect(result().props.v).toBe("status: loading");
        setStatus("idle");
        expect(result().props.v).toBe("status: idle");
      });
    });
  });
});
