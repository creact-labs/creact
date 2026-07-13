import { render, useAsyncOutput, For } from "@creact-labs/creact";
import { inspect, InspectMemory, VirtualFs } from "./inspector.mjs";

const fs = new VirtualFs();

const pages = [
  { path: "index.html", body: "<h1>Home</h1>" },
  { path: "about.html", body: "<h1>About</h1>" },
  { path: "blog/hello-world.html", body: "<h1>Hello, world</h1>" },
  { path: "blog/durable-workflows.html", body: "<h1>Durable workflows</h1>" },
];

function SiteObject(props: { path: string; body: string; order: number }) {
  useAsyncOutput(
    () => ({ path: props.path }),
    async (p, setOutputs) => {
      await new Promise((r) => setTimeout(r, props.order * 400));
      fs.write(`dist/${p.path}`, props.body);
      setOutputs({ status: "published", path: p.path });
    },
  );
  return <></>;
}

function SiteBucket(props: { children?: unknown }) {
  useAsyncOutput({}, async (_p, setOutputs) => {
    setOutputs({ status: "ready", url: "https://cdn.example.com" });
  });
  return <>{props.children}</>;
}

export default async function () {
  const result = render(
    () => (
      <SiteBucket key="bucket">
        <For each={pages} keyFn={(page) => page.path}>
          {(page, index) => (
            <SiteObject
              key={page().path}
              path={page().path}
              body={page().body}
              order={index()}
            />
          )}
        </For>
      </SiteBucket>
    ),
    new InspectMemory(),
    "site-publisher",
  );
  inspect(result);
  return result;
}
