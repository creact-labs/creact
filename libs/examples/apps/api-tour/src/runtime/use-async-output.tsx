/**
 * Samples for the useAsyncOutput API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { useAsyncOutput } from "@creact-labs/creact";

async function deployToS3(_name: string, _content: string): Promise<void> {}

async function deleteFromS3(_name: string): Promise<void> {}

export function hero(props: { name: string }) {
  // #region hero
  const result = useAsyncOutput(props, async (p, setOutputs) => {
    setOutputs({ url: "https://example.com" });
  });
  // #endregion hero
  return result;
}

// #region usage
function WebSite(props: { name: () => string; content: () => string }) {
  const site = useAsyncOutput(props, async (p, setOutputs) => {
    // p.name() and p.content() are the resolved prop values
    await deployToS3(p.name(), p.content());

    // setOutputs persists values automatically
    setOutputs((prev) => ({
      url: `https://${p.name()}.example.com`,
      version: (prev?.version ?? 0) + 1,
    }));

    // Optional cleanup, called when component is removed
    return async () => {
      await deleteFromS3(p.name());
    };
  });

  // site.url() and site.version() are reactive accessors
  return <></>;
}
// #endregion usage

export { WebSite };
