import { useAsyncOutput } from "@creact-labs/creact";

/** One generation task: turns a prompt into site HTML */
export function GenerateHtml(props: { prompt: string }) {
  useAsyncOutput({ prompt: props.prompt }, async (p, setOutputs) => {
    setOutputs({ generatedFrom: p.prompt });
  });
  return <></>;
}
