/**
 * Samples for the splitProps API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { splitProps, useAsyncOutput } from "@creact-labs/creact";

export function heroSample(props: {
  class?: string;
  style?: string;
  id?: string;
}) {
  // #region hero
  const [local, others] = splitProps(props, ["class", "style"]);
  // #endregion hero
  return [local, others];
}

// #region usage
function Server(props: { port: number; host?: string; handler: () => void }) {
  const [local, rest] = splitProps(props, ["handler"]);

  const server = useAsyncOutput(rest, async (p, setOutputs) => {
    // rest has port and host but not handler
    setOutputs({ url: `http://${p.host ?? "localhost"}:${p.port}` });
  });

  return <></>;
}
// #endregion usage

export { Server };
