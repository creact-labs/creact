import { describe, expect, it } from "vitest";
import { statusOf, STATUS_LABEL } from "../status";
import type { NodeSnapshot } from "../../stream";

function node(outputs: Record<string, unknown>): NodeSnapshot {
  return { id: "n", path: ["n"], key: "n", outputs };
}

describe("statusOf", () => {
  it.each([
    { outputs: { status: "deploying" }, expected: "deploying" },
    { outputs: { status: "pending" }, expected: "deploying" },
    { outputs: { status: "failed" }, expected: "failed" },
    { outputs: { status: "error" }, expected: "failed" },
    { outputs: { error: "boom" }, expected: "failed" },
    { outputs: { status: "ready" }, expected: "ready" },
    { outputs: { status: "up" }, expected: "ready" },
    { outputs: { status: "down" }, expected: "failed" },
    { outputs: { count: 3 }, expected: "ready" },
    { outputs: {}, expected: "deploying" },
  ])("$outputs → $expected", ({ outputs, expected }) => {
    expect(statusOf(node(outputs))).toBe(expected);
  });

  it("has a label for every status", () => {
    expect(Object.keys(STATUS_LABEL).sort()).toEqual([
      "deploying",
      "failed",
      "idle",
      "ready",
    ]);
  });
});
