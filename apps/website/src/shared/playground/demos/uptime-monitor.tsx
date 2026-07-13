import { render, useAsyncOutput, For } from "@creact-labs/creact";
import { inspect, InspectMemory, mockFetch } from "./inspector.mjs";

const targets = [
  { key: "api", url: "https://api.example.com/health" },
  { key: "web", url: "https://example.com" },
  { key: "cdn", url: "https://cdn.example.com/status" },
];

const fetch = mockFetch({
  "https://api.example.com/health": { status: 200, delay: 120 },
  "https://example.com": { status: 200, delay: 60 },
  "https://cdn.example.com/status": { status: 503, delay: 200 },
});

function Probe(props: { url: string }) {
  useAsyncOutput(
    () => ({ url: props.url }),
    async (p, setOutputs) => {
      const check = async () => {
        const res = await fetch(p.url);
        setOutputs({ status: res.ok ? "up" : "down", code: res.status });
      };
      await check();
      const id = setInterval(check, 3000);
      return () => clearInterval(id);
    },
  );
  return <></>;
}

export default async function () {
  const result = render(
    () => (
      <For each={targets} keyFn={(t) => t.key}>
        {(target) => <Probe key={target().key} url={target().url} />}
      </For>
    ),
    new InspectMemory(),
    "uptime-monitor",
  );
  inspect(result);
  return result;
}
