// #region imports
import {
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
  untrack,
  useAsyncOutput,
} from "@creact-labs/creact";
import type {
  CheckTally,
  ProbeSample,
  ProbeStatus,
  Target,
} from "../../shared/rollup";
// #endregion imports

// #region probe
async function probeTarget(url: string, timeoutMs: number): Promise<ProbeSample> {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return {
      url,
      status: response.ok ? "up" : "down",
      latencyMs: Date.now() - startedAt,
      checkedAt: Date.now(),
    };
  } catch {
    return { url, status: "down", latencyMs: Date.now() - startedAt, checkedAt: Date.now() };
  }
}
// #endregion probe

// #region check-props
type HttpCheckProps = {
  target: Target;
  intervalMs: number;
  timeoutMs: number;
  onSample: (sample: ProbeSample) => void;
  onTally: (tally: CheckTally) => void;
};
// #endregion check-props

// #region sweep
export function HttpCheck(props: HttpCheckProps) {
  const [latest, setLatest] = createSignal<ProbeSample | null>(null);

  const runProbe = async () => {
    const sample = await probeTarget(props.target.url, props.timeoutMs);
    console.log(`[probe] ${props.target.name}: ${sample.status} in ${sample.latencyMs}ms`);
    setLatest(sample);
    props.onSample(sample);
  };
  // #endregion sweep

  // #region sweep-lifecycle
  onMount(() => {
    void runProbe();
    const timer = setInterval(() => void runProbe(), props.intervalMs);
    onCleanup(() => clearInterval(timer));
  });
  // #endregion sweep-lifecycle

  // #region durable-tally
  const tally = useAsyncOutput<CheckTally>(
    () => ({ url: props.target.url, sample: latest() }),
    async (probeProps, setOutputs) => {
      setOutputs((prev) => ({
        url: probeProps.url,
        checksRun: (prev?.checksRun ?? 0) + (probeProps.sample ? 1 : 0),
        checksFailed:
          (prev?.checksFailed ?? 0) + (probeProps.sample?.status === "down" ? 1 : 0),
      }));
    },
  );

  createEffect(() => {
    const checksRun = tally.checksRun();
    const checksFailed = tally.checksFailed();
    if (checksRun === undefined || checksFailed === undefined) return;
    props.onTally({ url: props.target.url, checksRun, checksFailed });
  });
  // #endregion durable-tally

  // #region transitions
  const status = createMemo<ProbeStatus | "pending">(() => latest()?.status ?? "pending");

  createEffect(
    on(
      status,
      (next, prev) => {
        if (!prev || prev === "pending") return;
        const latencyMs = untrack(() => latest()?.latencyMs ?? 0);
        console.log(
          `[transition] ${props.target.name}: ${prev} -> ${next} after a ${latencyMs}ms probe`,
        );
      },
      { defer: true },
    ),
  );

  return <></>;
}
// #endregion transitions
