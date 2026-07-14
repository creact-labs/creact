import type { PanelKind } from "../inspector";
import counterSource from "./durable-counter.tsx?raw";
import uptimeSource from "./uptime-monitor.tsx?raw";
import publisherSource from "./site-publisher.tsx?raw";
import writerSource from "./page-writer.tsx?raw";
import fleetSource from "./tenant-fleet.tsx?raw";

/** One narrated beat of the scroll walkthrough. `from`/`to` are substrings of
 * the source; the stage spotlights the lines they fall on. */
export interface Step {
  caption: string;
  from: string;
  to?: string;
}

export interface Demo {
  id: string;
  title: string;
  description: string;
  panel: PanelKind;
  source: string;
  steps: Step[];
}

export const DEMOS: Record<string, Demo> = {
  "durable-counter": {
    id: "durable-counter",
    title: "Durable Counter",
    description:
      "A single resource that ticks once a second and persists its count to Memory. The runtime re-establishes the interval on every restart.",
    panel: "counter",
    source: counterSource,
    steps: [
      { caption: "A component declares exactly one resource.", from: "function Counter", to: "async (_props, setOutputs) => {" },
      { caption: "The handler restores the last count, then ticks every second.", from: "setOutputs((prev) => ({ count: prev?.count ?? 0 }))", to: "return () => clearInterval(id);" },
      { caption: "An effect logs each new value — reactivity, not re-rendering.", from: "createEffect(" },
      { caption: "render() mounts the tree against a Memory ledger.", from: "const result = render(", to: '"durable-counter",' },
    ],
  },
  "uptime-monitor": {
    id: "uptime-monitor",
    title: "Uptime Monitor",
    description:
      "One probe resource per target, each polling on its own interval. Outputs flip up/down as checks come back — one down target here shows the failure path.",
    panel: "uptime",
    source: uptimeSource,
    steps: [
      { caption: "Three targets to watch.", from: "const targets = [", to: "];" },
      { caption: "A mock HTTP client — the CDN route returns 503.", from: "const fetch = mockFetch({", to: "});" },
      { caption: "Each probe checks its target, then polls on an interval.", from: "function Probe", to: "return <></>;" },
      { caption: "One probe per target, keyed by name.", from: "<For each={targets}", to: "</For>" },
    ],
  },
  "site-publisher": {
    id: "site-publisher",
    title: "Site Publisher",
    description:
      "A bucket with one object per page. Each object writes its file when its handler runs, so the file tree fills in as the tree deploys.",
    panel: "fs",
    source: publisherSource,
    steps: [
      { caption: "The pages to publish.", from: "const pages = [", to: "];" },
      { caption: "Each object writes its file when its handler runs.", from: "function SiteObject", to: "return <></>;" },
      { caption: "A bucket owns the objects and exposes the site URL.", from: "function SiteBucket", to: "return <>{props.children}</>;" },
      { caption: "Nesting composes the bucket and its objects into a tree.", from: "<SiteBucket key=", to: "</SiteBucket>" },
    ],
  },
  "page-writer": {
    id: "page-writer",
    title: "Page Writer",
    description:
      "Each page resource asks a model to generate its content, streams the tokens in, then writes the result to disk.",
    panel: "ai",
    source: writerSource,
    steps: [
      { caption: "A mock model with scripted output per topic.", from: "const ai = mockAI({", to: "});" },
      { caption: "Each page generates its content, then writes it to disk.", from: "function Page", to: "return <></>;" },
      { caption: "One page resource per topic.", from: "<For each={", to: "</For>" },
    ],
  },
  "tenant-fleet": {
    id: "tenant-fleet",
    title: "Tenant Fleet",
    description:
      "Each tenant is its own sovereign runtime spawned with createRuntime. They deploy in parallel; a tenant's status surfaces as data on its wrapper node.",
    panel: "tenant",
    source: fleetSource,
    steps: [
      { caption: "A tenant is an ordinary component with its own resource.", from: "function TenantApp", to: "return <></>;" },
      { caption: "createRuntime turns it into a sovereign sub-runtime.", from: "const Tenant = createRuntime" },
      { caption: "Spawn a fleet across regions — they deploy in parallel.", from: '<Tenant key="us-east-1"', to: '<Tenant key="ap-south-1"' },
    ],
  },
};

export const DEMO_LIST: Demo[] = Object.values(DEMOS);

/** Which step index a scroll progress in [0,1] maps to, for `count` steps. */
export function stepForProgress(progress: number, count: number): number {
  if (count <= 0) return 0;
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.min(count - 1, Math.floor(clamped * count));
}
