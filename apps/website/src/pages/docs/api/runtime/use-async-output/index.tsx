import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";

const UseAsyncOutput: Component = () => {
  return (
    <>
      <h1>useAsyncOutput</h1>
      <p class="docs-description">
        Creates a resource with persisted outputs. The primary hook for CReact
        components that interact with external systems.
      </p>

      <DocCodeBlock
        code={`const result = useAsyncOutput(props, async (p, setOutputs) => {
  setOutputs({ url: 'https://example.com' });
});`}
      />

      <ApiReference
        name="useAsyncOutput"
        signature="useAsyncOutput<O, P>(propsOrGetter: P | (() => P), handler: Handler<P, O>): OutputAccessors<O>"
        parameters={[
          [<><code>propsOrGetter</code></>, <><code>P | (() =&gt; P)</code></>, "Static props or a getter function for reactive tracking. When a getter is used, the handler re-runs when dependencies change."],
          [<><code>handler</code></>, <><code>
                (props: P, setOutputs: SetOutputs&lt;O&gt;) =&gt; Promise&lt;(()
                =&gt; void) | void&gt; | void
              </code></>, "Setup function that performs work and sets outputs. May return a cleanup function (sync or async)."],
        ]}
        returns={
          <>
      <p>
        An object with accessor functions for each output key. For example, if
        you call
        <code>
          setOutputs({"{"} url: '...' {"}"})
        </code>
        , the return has <code>result.url()</code>.
      </p>
          </>
        }
      />

      <UsageSection
        code={`function WebSite(props: { name: () => string; content: () => string }) {
  const site = useAsyncOutput(props, async (p, setOutputs) => {
    // p.name() and p.content() are the resolved prop values
    await deployToS3(p.name(), p.content());

    // setOutputs persists values automatically
    setOutputs(prev => ({
      url: \`https://\${p.name()}.example.com\`,
      version: (prev?.version ?? 0) + 1,
    }));

    // Optional cleanup, called when component is removed
    return async () => {
      await deleteFromS3(p.name());
    };
  });

  // site.url() and site.version() are reactive accessors
  return <></>;
}`}
      />

      <Callout type="info">
        <p>
          Handlers must be idempotent. On restart, handlers re-run for all nodes
          to re-establish side effects (intervals, subscriptions, etc.). Output
          values are restored from state, but handlers must re-create any
          runtime artifacts.
        </p>
      </Callout>
    </>
  );
};

export default UseAsyncOutput;
