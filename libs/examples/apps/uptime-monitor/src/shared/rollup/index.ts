// #region status-model
export type ProbeStatus = "up" | "down";
export type OverallStatus = "up" | "degraded" | "down";

export type Target = { name: string; url: string };

export type ProbeSample = {
  url: string;
  status: ProbeStatus;
  latencyMs: number;
  checkedAt: number;
};

export type CheckTally = {
  url: string;
  checksRun: number;
  checksFailed: number;
};

export type Incident = { url: string; name: string; openedAt: number };
// #endregion status-model

// #region rollup-helpers
export function rollupStatus(statuses: ProbeStatus[]): OverallStatus {
  if (statuses.length === 0) return "up";
  const downCount = statuses.filter((status) => status === "down").length;
  if (downCount === 0) return "up";
  if (downCount === statuses.length) return "down";
  return "degraded";
}

export function uptimePercent(checksRun: number, checksFailed: number): number {
  if (checksRun === 0) return 100;
  return Math.round(((checksRun - checksFailed) / checksRun) * 10000) / 100;
}
// #endregion rollup-helpers
