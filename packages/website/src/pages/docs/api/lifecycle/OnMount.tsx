import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const OnMount: Component = () => {
  return (
    <>
      <h1>onMount</h1>
      <p class="docs-description">Runs a function once when the component initializes, without tracking dependencies.</p>

      <DocCodeBlock code={`onMount(() => {
  console.log('Component mounted');
});`} />

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature name="onMount" signature="onMount(fn: () => void): void" />

      <DocHeading level={3} id="parameters">Parameters</DocHeading>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>fn</code></td><td><code>() =&gt; void</code></td><td>Function to run once on mount. Runs untracked; signal reads don't create dependencies.</td></tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock code={`function App() {
  onMount(() => {
    console.log('App started');
  });

  return <></>;
}`} />
    </>
  );
};

export default OnMount;
