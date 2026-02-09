import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const Batch: Component = () => {
  return (
    <>
      <h1>batch</h1>
      <p class="docs-description">Groups multiple signal updates into a single computation pass.</p>

      <DocCodeBlock code={`batch(() => {
  setA(1);
  setB(2);
  setC(3);
}); // Effects run once, not three times`} />

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature name="batch" signature="batch<T>(fn: () => T): T" />

      <DocHeading level={3} id="parameters">Parameters</DocHeading>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>fn</code></td><td><code>() =&gt; T</code></td><td>Function containing signal updates. All updates are deferred until the function completes.</td></tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">Returns</DocHeading>
      <p>The return value of <code>fn</code>.</p>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock code={`const [firstName, setFirstName] = createSignal('');
const [lastName, setLastName] = createSignal('');

createEffect(() => {
  // Only runs once per batch, not twice
  console.log(\`\${firstName()} \${lastName()}\`);
});

batch(() => {
  setFirstName('John');
  setLastName('Doe');
}); // Logs: "John Doe" (once)`} />
    </>
  );
};

export default Batch;
