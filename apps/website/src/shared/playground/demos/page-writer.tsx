import { render, useAsyncOutput, For } from "@creact-labs/creact";
import { inspect, InspectMemory, mockAI, VirtualFs } from "./inspector.mjs";

const fs = new VirtualFs();

const ai = mockAI({
  landing:
    "Welcome to CReact. Declare the resources your workflow needs, and the runtime reconciles the difference — tracking dependencies and persisting state across restarts.",
  pricing:
    "CReact is open source and free. You bring the Memory backend; the runtime does the reconciliation.",
  default: "Generated page content.",
});

function Page(props: { topic: string }) {
  useAsyncOutput(
    () => ({ topic: props.topic }),
    async (p, setOutputs) => {
      setOutputs({ status: "generating" });
      const html = await ai.generate(p.topic, { node: p.topic });
      fs.write(`pages/${p.topic}.html`, html);
      setOutputs({ status: "published", chars: html.length });
    },
  );
  return <></>;
}

export default async function () {
  const result = render(
    () => (
      <For each={["landing", "pricing"]} keyFn={(topic) => topic}>
        {(topic) => <Page key={topic()} topic={topic()} />}
      </For>
    ),
    new InspectMemory(),
    "page-writer",
  );
  inspect(result);
  return result;
}
