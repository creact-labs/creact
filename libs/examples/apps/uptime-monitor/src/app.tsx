// #region imports
import {
  batch,
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  ErrorBoundary,
  For,
  Match,
  Show,
  Switch,
} from "@creact-labs/creact";
import { Alert } from "./components/alert";
import { HttpCheck } from "./components/http-check";
import { StatusPage } from "./components/status-page";
import {
  type CheckTally,
  type Incident,
  type OverallStatus,
  type ProbeSample,
  type ProbeStatus,
  rollupStatus,
  type Target,
} from "./shared/rollup";
// #endregion imports

// #region targets
const targets: Target[] = [
  { name: "Example", url: "https://example.com" },
  { name: "Wikipedia", url: "https://wikipedia.org" },
  { name: "Retired API", url: "https://localhost:1" },
];

const sweepIntervalMs = 5000;
const probeTimeoutMs = 4000;
// #endregion targets

// #region sweep-state
export function App() {
  const [samples, setSamples] = createSignal<Record<string, ProbeSample[]>>({});
  const [tallies, setTallies] = createSignal<Record<string, CheckTally>>({});
  const [lastSweepAt, setLastSweepAt] = createSignal<number | null>(null);

  const recordSample = (sample: ProbeSample) => {
    batch(() => {
      setSamples((prev) => ({
        ...prev,
        [sample.url]: [...(prev[sample.url] ?? []), sample].slice(-60),
      }));
      setLastSweepAt(sample.checkedAt);
    });
  };

  const recordTally = (tally: CheckTally) => {
    setTallies((prev) => ({ ...prev, [tally.url]: tally }));
  };
  // #endregion sweep-state

  // #region derived-status
  const latestSamples = createMemo(() =>
    targets.map((target) => ({ target, sample: samples()[target.url]?.at(-1) })),
  );

  const overall = createMemo<OverallStatus>(() =>
    rollupStatus(
      latestSamples()
        .map((entry) => entry.sample?.status)
        .filter((status): status is ProbeStatus => status !== undefined),
    ),
  );
  // #endregion derived-status

  // #region incidents
  const [incidents, setIncidents] = createSignal<Incident[]>([]);

  createComputed(() => {
    const down = latestSamples().filter((entry) => entry.sample?.status === "down");
    setIncidents((prev) => {
      const stillOpen = prev.filter((incident) =>
        down.some((entry) => entry.target.url === incident.url),
      );
      const opened = down
        .filter((entry) => !prev.some((incident) => incident.url === entry.target.url))
        .map((entry) => ({
          url: entry.target.url,
          name: entry.target.name,
          openedAt: entry.sample?.checkedAt ?? Date.now(),
        }));
      if (opened.length === 0 && stillOpen.length === prev.length) return prev;
      return [...stillOpen, ...opened];
    });
  });
  // #endregion incidents

  // #region layout
  return (
    <>
      <ErrorBoundary fallback={(error) => <MonitorFault error={error} />}>
        <For each={targets} keyFn={(target) => target.url}>
          {(target) => (
            <HttpCheck
              key={target().url}
              target={target()}
              intervalMs={sweepIntervalMs}
              timeoutMs={probeTimeoutMs}
              onSample={recordSample}
              onTally={recordTally}
            />
          )}
        </For>
      </ErrorBoundary>
      <Alert incidents={incidents} />
      <Show when={() => lastSweepAt() !== null}>
        <StatusPage targets={targets} samples={samples} tallies={tallies} overall={overall} />
        <Switch fallback={<StatusBanner overall="up" incidents={incidents} />}>
          <Match when={() => overall() === "down"}>
            <StatusBanner overall="down" incidents={incidents} />
          </Match>
          <Match when={() => overall() === "degraded"}>
            <StatusBanner overall="degraded" incidents={incidents} />
          </Match>
        </Switch>
      </Show>
    </>
  );
}
// #endregion layout

// #region status-banner
function StatusBanner(props: { overall: OverallStatus; incidents: () => Incident[] }) {
  createEffect(() => {
    const names = props.incidents().map((incident) => incident.name);
    if (props.overall === "up") {
      console.log("[monitor] all targets up");
    } else {
      console.log(`[monitor] ${props.overall} — down: ${names.join(", ")}`);
    }
  });
  return <></>;
}
// #endregion status-banner

// #region monitor-fault
function MonitorFault(props: { error: Error }) {
  createEffect(() => {
    console.error(`[monitor] checks halted: ${props.error.message}`);
  });
  return <></>;
}
// #endregion monitor-fault
