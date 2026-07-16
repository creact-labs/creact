// The example apps that can open in the playground. Titles only — the source
// itself lives in libs/examples and is pulled in by sources.ts.
export interface AppMeta {
  id: string;
  title: string;
}

export const DEMOS: Record<string, AppMeta> = {
  "durable-counter": { id: "durable-counter", title: "Durable Counter" },
  "uptime-monitor": { id: "uptime-monitor", title: "Uptime Monitor" },
  "site-publisher": { id: "site-publisher", title: "Site Publisher" },
  "page-writer": { id: "page-writer", title: "Page Writer" },
  "tenant-fleet": { id: "tenant-fleet", title: "Tenant Fleet" },
};
