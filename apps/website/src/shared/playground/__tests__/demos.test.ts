import { describe, expect, it } from "vitest";
import { DEMO_LIST, DEMOS, stepForProgress } from "../demos";

describe("demo registry", () => {
  it("every demo has steps whose anchors exist in its source", () => {
    for (const demo of DEMO_LIST) {
      expect(demo.steps.length).toBeGreaterThan(0);
      for (const step of demo.steps) {
        expect(demo.source).toContain(step.from);
        if (step.to) expect(demo.source).toContain(step.to);
      }
    }
  });

  it("exposes the five example apps", () => {
    expect(Object.keys(DEMOS).sort()).toEqual([
      "durable-counter",
      "page-writer",
      "site-publisher",
      "tenant-fleet",
      "uptime-monitor",
    ]);
  });
});

describe("stepForProgress", () => {
  it.each([
    { progress: 0, count: 4, expected: 0 },
    { progress: 0.24, count: 4, expected: 0 },
    { progress: 0.26, count: 4, expected: 1 },
    { progress: 0.6, count: 4, expected: 2 },
    { progress: 1, count: 4, expected: 3 },
    { progress: 1.5, count: 4, expected: 3 },
    { progress: -0.5, count: 4, expected: 0 },
    { progress: 0.5, count: 0, expected: 0 },
  ])("progress $progress of $count → $expected", ({ progress, count, expected }) => {
    expect(stepForProgress(progress, count)).toBe(expected);
  });
});
