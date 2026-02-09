import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";
import Callout from "../../../../components/docs/Callout";

const CreateEffect: Component = () => {
  return (
    <>
      <h1>createEffect</h1>
      <p class="docs-description">Creates a reactive side effect that runs when its dependencies change. Use for side effects (logging, external calls). Runs after the current batch.</p>

      <DocCodeBlock code={`createEffect(() => {
  console.log('Count is:', count());
});`} />

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="createEffect"
        signature="createEffect<Next, Init = Next>(fn: (v: Init | Next) => Next, value?: Init, options?: EffectOptions): void"
      />

      <DocHeading level={3} id="parameters">Parameters</DocHeading>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>fn</code></td><td><code>(v: Init | Next) =&gt; Next</code></td><td>Effect function. Receives previous return value. Automatically tracked.</td></tr>
          <tr><td><code>value</code></td><td><code>Init</code></td><td>Optional initial value passed to the first run.</td></tr>
          <tr><td><code>options</code></td><td><code>EffectOptions</code></td><td>Optional. <code>name</code> for debugging.</td></tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">Usage</DocHeading>

      <DocHeading level={3} id="basic">Tracking Dependencies</DocHeading>
      <DocCodeBlock code={`const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);

createEffect(() => {
  // Re-runs when a() OR b() changes
  console.log(a() + b());
});`} />

      <DocHeading level={3} id="with-previous">Using Previous Value</DocHeading>
      <DocCodeBlock code={`createEffect((prev) => {
  const current = count();
  console.log(\`Changed from \${prev} to \${current}\`);
  return current;
}, 0);`} />

      <DocHeading level={3} id="cleanup">Cleanup with onCleanup</DocHeading>
      <DocCodeBlock code={`import { createEffect, onCleanup } from '@creact-labs/creact';

createEffect(() => {
  const interval = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(interval));
});`} />

      <Callout type="info">
        <p>
          Effects are batched. Multiple synchronous signal updates only trigger one re-run.
          Use <code>batch()</code> explicitly for complex update sequences.
        </p>
      </Callout>
    </>
  );
};

export default CreateEffect;
