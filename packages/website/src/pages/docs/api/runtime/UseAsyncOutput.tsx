import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";
import Callout from "../../../../components/docs/Callout";

const UseAsyncOutput: Component = () => {
  return (
    <>
      <h1>useAsyncOutput</h1>
      <p class="docs-description">Creates a resource with persisted outputs. The primary hook for CReact components that interact with external systems.</p>

      <DocCodeBlock code={`const result = useAsyncOutput(props, async (p, setOutputs) => {
  setOutputs({ url: 'https://example.com' });
});`} />

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="useAsyncOutput"
        signature="useAsyncOutput<O, P>(propsOrGetter: P | (() => P), handler: Handler<P, O>): OutputAccessors<O>"
      />

      <DocHeading level={3} id="parameters">Parameters</DocHeading>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>propsOrGetter</code></td><td><code>P | (() =&gt; P)</code></td><td>Static props or a getter function for reactive tracking. When a getter is used, the handler re-runs when dependencies change.</td></tr>
          <tr><td><code>handler</code></td><td><code>(props: P, setOutputs: SetOutputs&lt;O&gt;) =&gt; Promise&lt;(() =&gt; void) | void&gt; | void</code></td><td>Setup function that performs work and sets outputs. May return a cleanup function (sync or async).</td></tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">Returns</DocHeading>
      <p>
        An object with accessor functions for each output key. For example, if you call
        <code>setOutputs({'{'} url: '...' {'}'})</code>, the return has <code>result.url()</code>.
      </p>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock code={`function WebSite(props: { name: () => string; content: () => string }) {
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
}`} />

      <Callout type="info">
        <p>
          Handlers must be idempotent. On restart, handlers re-run for all nodes to re-establish
          side effects (intervals, subscriptions, etc.). Output values are restored from
          state, but handlers must re-create any runtime artifacts.
        </p>
      </Callout>
    </>
  );
};

export default UseAsyncOutput;
