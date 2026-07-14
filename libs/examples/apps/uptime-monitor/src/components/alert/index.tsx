// #region imports
import { createReaction } from "@creact-labs/creact";
import { appendFile, mkdir } from "fs/promises";
import type { Incident } from "../../shared/rollup";
// #endregion imports

// #region first-failure
export function Alert(props: { incidents: () => Incident[] }) {
  const alerted = new Set<string>();

  const arm = createReaction(() => {
    for (const incident of props.incidents()) {
      const incidentId = `${incident.url}@${incident.openedAt}`;
      if (alerted.has(incidentId)) continue;
      alerted.add(incidentId);
      void recordAlert(incident);
    }
    arm(() => props.incidents());
  });

  arm(() => props.incidents());
  return <></>;
}
// #endregion first-failure

// #region alert-log
async function recordAlert(incident: Incident): Promise<void> {
  const line = `${new Date(incident.openedAt).toISOString()} ALERT ${incident.name} is down (${incident.url})`;
  console.error(`[alert] ${line}`);
  await mkdir("./out", { recursive: true });
  await appendFile("./out/alerts.log", `${line}\n`);
}
// #endregion alert-log
