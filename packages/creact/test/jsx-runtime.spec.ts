import { describe, expect, it } from "vitest";
import {
  createElement,
  Fragment,
  jsx,
  jsxDEV,
  jsxs,
} from "../src/jsx/jsx-runtime";

describe("createElement (classic transform)", () => {
  it("builds an element with no children", () => {
    const el = createElement("db", { size: 1 });

    expect(el.type).toBe("db");
    expect(el.props.size).toBe(1);
    expect(el.props.children).toBeUndefined();
  });

  it("passes a single child through directly", () => {
    const child = createElement("cache", null);

    const el = createElement("db", null, child);

    expect(el.props.children).toBe(child);
  });

  it("collects multiple children into an array", () => {
    const a = createElement("a", null);
    const b = createElement("b", null);

    const el = createElement("db", null, a, b);

    expect(el.props.children).toEqual([a, b]);
  });

  it("tolerates null props", () => {
    expect(createElement("x", null).props).toEqual({});
  });
});

describe("jsx / jsxs / jsxDEV (automatic transform)", () => {
  it.each([
    { label: "jsx", fn: jsx },
    { label: "jsxs", fn: jsxs },
    { label: "jsxDEV", fn: jsxDEV },
  ])("$label produces { type, props, key }", ({ fn }) => {
    const el = fn("component", { a: 1 }, "my-key");

    expect(el).toEqual({ type: "component", props: { a: 1 }, key: "my-key" });
  });

  it("Fragment is a stable shared symbol", () => {
    expect(Fragment).toBe(Symbol.for("creact.fragment"));
  });
});
