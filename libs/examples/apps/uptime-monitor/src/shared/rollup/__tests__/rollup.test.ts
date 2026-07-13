import { describe, expect, it } from "vitest";
import { rollupStatus, uptimePercent } from "../index";

describe("rollupStatus", () => {
  it("reports up before any target has been probed", () => {
    expect(rollupStatus([])).toBe("up");
  });

  it("reports up when every target is up", () => {
    expect(rollupStatus(["up", "up", "up"])).toBe("up");
  });

  it("reports degraded when some targets are down", () => {
    expect(rollupStatus(["up", "down", "up"])).toBe("degraded");
  });

  it("reports down when every target is down", () => {
    expect(rollupStatus(["down", "down"])).toBe("down");
  });
});

describe("uptimePercent", () => {
  it("returns 100 before the first check", () => {
    expect(uptimePercent(0, 0)).toBe(100);
  });

  it("returns 100 when no checks failed", () => {
    expect(uptimePercent(12, 0)).toBe(100);
  });

  it("rounds to two decimal places", () => {
    expect(uptimePercent(3, 1)).toBe(66.67);
  });

  it("returns 0 when every check failed", () => {
    expect(uptimePercent(5, 5)).toBe(0);
  });
});
