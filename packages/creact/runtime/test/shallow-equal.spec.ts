import { describe, expect, it } from "vitest";
import { shallowEqual } from "../src/instance";

describe("shallowEqual", () => {
  // Reference equality
  it("returns true for same reference", () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  // Null/undefined
  it("returns false for null vs object", () => {
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual({}, null)).toBe(false);
  });

  it("returns true for null vs null", () => {
    expect(shallowEqual(null, null)).toBe(true);
  });

  it("returns false for undefined vs object", () => {
    expect(shallowEqual(undefined, {})).toBe(false);
  });

  // Primitives
  it("returns false for different primitives", () => {
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual("a", "b")).toBe(false);
  });

  it("returns true for same primitives", () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual("a", "a")).toBe(true);
  });

  // Plain objects
  it("returns true for objects with same keys and values", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it("returns false for objects with different values", () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("returns false for objects with different keys", () => {
    expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false);
  });

  it("returns false for objects with different key count", () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  // Arrays
  it("returns true for arrays with same elements", () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
  });

  it("returns true for empty arrays", () => {
    expect(shallowEqual([], [])).toBe(true);
  });

  it("returns false for arrays with different length", () => {
    expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("returns false for arrays with different elements", () => {
    expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
  });

  it("returns false for array vs non-array", () => {
    expect(shallowEqual([1], { 0: 1 })).toBe(false);
  });

  // Maps
  it("returns true for Maps with same entries", () => {
    expect(shallowEqual(
      new Map([["a", 1], ["b", 2]]),
      new Map([["a", 1], ["b", 2]]),
    )).toBe(true);
  });

  it("returns true for empty Maps", () => {
    expect(shallowEqual(new Map(), new Map())).toBe(true);
  });

  it("returns false for Maps with different size", () => {
    expect(shallowEqual(
      new Map([["a", 1]]),
      new Map([["a", 1], ["b", 2]]),
    )).toBe(false);
  });

  it("returns false for Maps with different values", () => {
    expect(shallowEqual(
      new Map([["a", 1]]),
      new Map([["a", 2]]),
    )).toBe(false);
  });

  it("returns false for Maps with different keys", () => {
    expect(shallowEqual(
      new Map([["a", 1]]),
      new Map([["b", 1]]),
    )).toBe(false);
  });

  it("returns false for Map vs plain object", () => {
    expect(shallowEqual(new Map([["a", 1]]), { a: 1 })).toBe(false);
  });

  // Sets
  it("returns true for Sets with same members", () => {
    expect(shallowEqual(new Set([1, 2, 3]), new Set([1, 2, 3]))).toBe(true);
  });

  it("returns true for empty Sets", () => {
    expect(shallowEqual(new Set(), new Set())).toBe(true);
  });

  it("returns false for Sets with different size", () => {
    expect(shallowEqual(new Set([1]), new Set([1, 2]))).toBe(false);
  });

  it("returns false for Sets with different members", () => {
    expect(shallowEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
  });

  it("returns false for Set vs Array", () => {
    expect(shallowEqual(new Set([1, 2]), [1, 2])).toBe(false);
  });

  // Cross-type
  it("returns false for Map vs Set", () => {
    expect(shallowEqual(new Map(), new Set())).toBe(false);
  });
});
