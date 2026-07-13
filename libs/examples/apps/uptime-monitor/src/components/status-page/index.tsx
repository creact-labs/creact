// #region imports
import { catchError, createEffect, createMemo } from "@creact-labs/creact";
import { mkdir, writeFile } from "fs/promises";
import {
  type CheckTally,
  type OverallStatus,
  type ProbeSample,
  type Target,
  uptimePercent,
} from "../../shared/rollup";
// #endregion imports

// #region page-model
type StatusPageProps = {
  targets: Target[];
  samples: () => Record<string, ProbeSample[]>;
  tallies: () => Record<string, CheckTally>;
  overall: () => OverallStatus;
};

type StatusRow = {
  name: string;
  url: string;
  status: string;
  latencyMs: number;
  uptime: number;
};
// #endregion page-model

// #region uptime-rows
export function StatusPage(props: StatusPageProps) {
  const rows = createMemo<StatusRow[]>(() =>
    props.targets.map((target) => {
      const latest = props.samples()[target.url]?.at(-1);
      const tally = props.tallies()[target.url];
      return {
        name: target.name,
        url: target.url,
        status: latest?.status ?? "pending",
        latencyMs: latest?.latencyMs ?? 0,
        uptime: uptimePercent(tally?.checksRun ?? 0, tally?.checksFailed ?? 0),
      };
    }),
  );
  // #endregion uptime-rows

  // #region write-effect
  createEffect(() => {
    const html = catchError(
      () => renderStatusHtml(props.overall(), rows()),
      (error) => console.error(`[status-page] render failed: ${error.message}`),
    );
    if (html === undefined) return;
    void publishPage(html);
  });

  return <></>;
}
// #endregion write-effect

// #region render-html
function renderStatusHtml(overall: OverallStatus, rows: StatusRow[]): string {
  const items = rows
    .map(
      (row) =>
        `<li class="${row.status}"><strong>${row.name}</strong> ${row.status} — ` +
        `${row.uptime}% uptime, last probe ${row.latencyMs}ms</li>`,
    )
    .join("\n      ");
  return `<!doctype html>
<html>
  <head><title>Status: ${overall}</title></head>
  <body>
    <h1>Overall: ${overall}</h1>
    <ul>
      ${items}
    </ul>
    <p>Generated ${new Date().toISOString()}</p>
  </body>
</html>
`;
}
// #endregion render-html

// #region publish
async function publishPage(html: string): Promise<void> {
  await mkdir("./out", { recursive: true });
  await writeFile("./out/status.html", html);
  console.log("[status-page] wrote ./out/status.html");
}
// #endregion publish
