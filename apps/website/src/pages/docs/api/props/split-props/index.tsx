import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const SplitProps: Component = () => {
  return (
    <>
      <h1>splitProps</h1>
      <p class="docs-description">
        Splits a props object into multiple groups by key. Preserves reactivity.
      </p>

      <DocCodeBlock
        code={`const [local, others] = splitProps(props, ['class', 'style']);`}
      />

      <ApiReference
        name="splitProps"
        signature="splitProps<T>(props: T, ...keys: (keyof T)[][]): [...Pick<T, ...>[], Omit<T, ...>]"
      />
      <p>
        Takes the props object followed by one or more arrays of keys. Returns a
        tuple with one object per key group plus a remainder object containing
        all unmatched keys.
      </p>

      <UsageSection
        code={`function Server(props: { port: number; host?: string; handler: () => void }) {
  const [local, rest] = splitProps(props, ['handler']);

  const server = useAsyncOutput(rest, async (p, setOutputs) => {
    // rest has port and host but not handler
    setOutputs({ url: \`http://\${p.host ?? 'localhost'}:\${p.port}\` });
  });

  return <></>;
}`}
      />
    </>
  );
};

export default SplitProps;
