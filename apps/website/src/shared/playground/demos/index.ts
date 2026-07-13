import type { PanelKind } from "../inspector";
import counterSource from "./durable-counter.tsx?raw";
import uptimeSource from "./uptime-monitor.tsx?raw";
import publisherSource from "./site-publisher.tsx?raw";
import writerSource from "./page-writer.tsx?raw";
import fleetSource from "./tenant-fleet.tsx?raw";

export interface Demo {
  id: string;
  title: string;
  description: string;
  panel: PanelKind;
  source: string;
}

export const DEMOS: Record<string, Demo> = {
  "durable-counter": {
    id: "durable-counter",
    title: "Durable Counter",
    description:
      "A single resource that ticks once a second and persists its count to Memory. The runtime re-establishes the interval on every restart.",
    panel: "counter",
    source: counterSource,
  },
  "uptime-monitor": {
    id: "uptime-monitor",
    title: "Uptime Monitor",
    description:
      "One probe resource per target, each polling on its own interval. Outputs flip up/down as checks come back — one down target here shows the failure path.",
    panel: "uptime",
    source: uptimeSource,
  },
  "site-publisher": {
    id: "site-publisher",
    title: "Site Publisher",
    description:
      "A bucket with one object per page. Each object writes its file when its handler runs, so the file tree fills in as the tree deploys.",
    panel: "fs",
    source: publisherSource,
  },
  "page-writer": {
    id: "page-writer",
    title: "Page Writer",
    description:
      "Each page resource asks a model to generate its content, streams the tokens in, then writes the result to disk.",
    panel: "ai",
    source: writerSource,
  },
  "tenant-fleet": {
    id: "tenant-fleet",
    title: "Tenant Fleet",
    description:
      "Each tenant is its own sovereign runtime spawned with createRuntime. They deploy in parallel; a tenant's status surfaces as data on its wrapper node.",
    panel: "tenant",
    source: fleetSource,
  },
};

export const DEMO_LIST: Demo[] = Object.values(DEMOS);
