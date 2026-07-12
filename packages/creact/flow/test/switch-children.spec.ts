import { describe, expect, it } from "vitest";
import { Match, Switch } from "../src/Switch";

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
