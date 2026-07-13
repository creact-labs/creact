import { useAsyncOutput } from "@creact-labs/creact";

export interface SiteConfig {
  path: string;
  content: string;
}

/** One deployed static site; reactive props re-deploy on content change */
export function WebSite(props: { name: () => string; content: () => string }) {
  useAsyncOutput(
    () => ({ name: props.name(), content: props.content() }),
    async (p, setOutputs) => {
      setOutputs({ url: `https://${p.name}.example.com` });
    },
  );
  return <></>;
}
