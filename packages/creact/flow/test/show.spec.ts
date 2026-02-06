import { describe, expect, it } from "vitest";
import type { JSXElement } from "../../src/index";
import { createMemo, createRoot, createSignal, Show } from "../../src/index";

const h = (type: string, props: Record<string, any> = {}): JSXElement => ({
  type,
  props,
});

/**
 * Show control flow tests
 *
 * Since CReact doesn't render to DOM, we test the reactive accessor
 * returned by Show. The accessor evaluates to children when truthy,
 * fallback when falsy.
 */

describe("Show", () => {
  describe("basic conditional rendering", () => {
    it("returns undefined when condition is falsy and no fallback", () => {
      createRoot(() => {
        const hello = h("t", { v: "hello" });
        const result = Show({
          when: false,
          children: hello,
        }) as unknown as () => any;
        expect(result()).toBeUndefined();
      });
    });

    it("returns children when condition is truthy", () => {
      createRoot(() => {
        const hello = h("t", { v: "hello" });
        const result = Show({
          when: true,
          children: hello,
        }) as unknown as () => any;
        expect(result()).toBe(hello);
      });
    });

    it("returns fallback when condition is falsy", () => {
      createRoot(() => {
        const hello = h("t", { v: "hello" });
        const bye = h("t", { v: "bye" });
        const result = Show({
          when: false,
          children: hello,
          fallback: bye,
        }) as unknown as () => any;
        expect(result()).toBe(bye);
      });
    });
  });

  describe("reactive conditional rendering", () => {
    it("toggles between children and fallback when signal changes", () => {
      createRoot(() => {
        const [count, setCount] = createSignal(0);
        const visible = h("t", { v: "visible" });
        const hidden = h("t", { v: "hidden" });
        const result = Show({
          when: () => count() >= 5,
          children: visible,
          fallback: hidden,
        }) as unknown as () => any;

        expect(result()).toBe(hidden);
        setCount(7);
        expect(result()).toBe(visible);
        setCount(5);
        expect(result()).toBe(visible);
        setCount(2);
        expect(result()).toBe(hidden);
      });
    });

    it("returns undefined when toggled off with no fallback", () => {
      createRoot(() => {
        const [show, setShow] = createSignal(true);
        const content = h("t", { v: "content" });
        const result = Show({
          when: () => show(),
          children: content,
        }) as unknown as () => any;

        expect(result()).toBe(content);
        setShow(false);
        expect(result()).toBeUndefined();
        setShow(true);
        expect(result()).toBe(content);
      });
    });
  });

  describe("non-keyed behavior", () => {
    it("does not re-evaluate when condition when value is same", () => {
      createRoot(() => {
        const [count, setCount] = createSignal(0);
        let whenExecuted = 0;

        const content = h("t", { v: "content" });
        const result = Show({
          when: () => {
            whenExecuted++;
            return count();
          },
          children: content,
        }) as unknown as () => any;

        expect(whenExecuted).toBe(1);
        expect(result()).toBeUndefined();

        setCount(7);
        expect(whenExecuted).toBe(2);
        expect(result()).toBe(content);

        setCount(5);
        expect(whenExecuted).toBe(3);
        expect(result()).toBe(content);

        // Same value — memo should not re-execute
        setCount(5);
        expect(whenExecuted).toBe(3);

        setCount(0);
        expect(whenExecuted).toBe(4);
        expect(result()).toBeUndefined();
      });
    });

    it("does not re-create children when truthiness stays the same (static children)", () => {
      createRoot(() => {
        const [count, setCount] = createSignal(0);
        let childrenExecuted = 0;
        let whenExecuted = 0;

        const content = (() => {
          childrenExecuted++;
          return h("t", { v: "content" });
        })();
        const result = Show({
          when: () => {
            whenExecuted++;
            return count();
          },
          children: content,
        }) as unknown as () => any;

        expect(result()).toBeUndefined();
        expect(whenExecuted).toBe(1);
        expect(childrenExecuted).toBe(1);

        setCount(7);
        expect(whenExecuted).toBe(2);
        expect(result()).toBe(content);
        // Static children are not re-evaluated
        expect(childrenExecuted).toBe(1);

        setCount(5);
        expect(whenExecuted).toBe(3);
        expect(result()).toBe(content);
        expect(childrenExecuted).toBe(1);

        // Same value
        setCount(5);
        expect(whenExecuted).toBe(3);

        setCount(0);
        expect(whenExecuted).toBe(4);
        expect(result()).toBeUndefined();
        expect(childrenExecuted).toBe(1);

        setCount(5);
        expect(whenExecuted).toBe(5);
      });
    });
  });

  describe("function children (non-keyed)", () => {
    it("passes accessor to function children", () => {
      createRoot(() => {
        const [count, setCount] = createSignal(5);
        let childExecuted = 0;

        const result = Show({
          when: () => count(),
          children: (item: () => number) => {
            childExecuted++;
            // In non-keyed mode, item is an accessor
            // Wrap in createMemo to make the result reactive
            return createMemo(() => h("text", { v: `value: ${item()}` }));
          },
        }) as unknown as () => any;

        expect(childExecuted).toBe(1);
        // result() returns the memo, calling it gives the JSXElement
        expect(result()().props.v).toBe("value: 5");

        // When truthiness stays the same, children function is NOT re-called
        // (non-keyed behavior) but the accessor updates
        setCount(10);
        expect(childExecuted).toBe(1);
        expect(result()().props.v).toBe("value: 10");
      });
    });

    it("re-creates function children when toggling falsy/truthy", () => {
      createRoot(() => {
        const [count, setCount] = createSignal(0);
        let childExecuted = 0;
        const none = h("t", { v: "none" });

        const result = Show({
          when: () => count(),
          children: (item: () => number) => {
            childExecuted++;
            return h("val", { n: item() });
          },
          fallback: none,
        }) as unknown as () => any;

        expect(childExecuted).toBe(0);
        expect(result()).toBe(none);

        setCount(5);
        expect(childExecuted).toBe(1);
        expect(result().props.n).toBe(5);

        setCount(0);
        expect(result()).toBe(none);

        setCount(3);
        expect(childExecuted).toBe(2);
        expect(result().props.n).toBe(3);
      });
    });
  });

  describe("with reactive fallback", () => {
    it("supports accessor fallback", () => {
      createRoot(() => {
        const [count, setCount] = createSignal(0);
        const [fallbackEl, setFallbackEl] = createSignal(
          h("fb", { v: "loading" }),
        );
        const content = h("t", { v: "content" });

        const result = Show({
          when: () => count() > 0,
          children: content,
          fallback: () => fallbackEl(),
        }) as unknown as () => any;

        expect(result().props.v).toBe("loading");
        setFallbackEl(h("fb", { v: "waiting" }));
        expect(result().props.v).toBe("waiting");
        setCount(1);
        expect(result()).toBe(content);
      });
    });
  });
});
