import type { NodeSnapshot } from "../stream";

export type Status = "idle" | "deploying" | "ready" | "failed";

// The universal devtools status grammar: gray idle, blue (pulsing) in-flight,
// green ready, red failed. Derived from a node's own `status` output when it
// declares one, otherwise inferred from whether outputs have landed yet.
export function statusOf(node: NodeSnapshot): Status {
  const declared = node.outputs.status;
  if (declared === "deploying" || declared === "pending") return "deploying";
  if (declared === "failed" || declared === "error" || node.outputs.error) return "failed";
  if (declared === "ready" || declared === "up") return "ready";
  if (declared === "down") return "failed";
  return Object.keys(node.outputs).length > 0 ? "ready" : "deploying";
}

export const STATUS_LABEL: Record<Status, string> = {
  idle: "idle",
  deploying: "deploying",
  ready: "ready",
  failed: "failed",
};
