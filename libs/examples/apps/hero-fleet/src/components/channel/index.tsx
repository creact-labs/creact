import { useAsyncOutput } from "@creact-labs/creact";
import type { SiteConfig } from "@creact-labs/example-demo-site";

interface ChannelProps {
  port: number;
  onGenerate: (prompt: string) => void;
  onList: () => SiteConfig[];
}

/** HTTP channel resource: accepts generation requests from the outside */
export function Channel(props: ChannelProps) {
  useAsyncOutput({ port: props.port }, async (p, setOutputs) => {
    setOutputs({ listening: p.port });
  });
  return <></>;
}
