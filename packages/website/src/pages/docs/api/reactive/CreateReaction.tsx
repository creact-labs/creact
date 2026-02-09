import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const CreateReaction: Component = () => {
  return (
    <>
      <h1>createReaction</h1>
      <p class="docs-description">Separates tracking from execution. Track one expression, run a different function when it changes. The reaction fires once, then must be re-armed.</p>

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="createReaction"
        signature="createReaction(onInvalidate: () => void, options?: EffectOptions): (tracking: () => void) => void"
      />

      <DocHeading level={3} id="parameters">Parameters</DocHeading>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>onInvalidate</code></td><td><code>() =&gt; void</code></td><td>Callback that fires once when tracked signals change.</td></tr>
          <tr><td><code>options</code></td><td><code>EffectOptions</code></td><td>Optional. <code>name</code> for debugging.</td></tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">Returns</DocHeading>
      <p>
        A function <code>(tracking: () =&gt; void) =&gt; void</code> that arms the reaction.
        Call it with a tracking expression. Signals read inside are tracked. When any of them
        change, <code>onInvalidate</code> fires once and tracking stops until you call the
        function again.
      </p>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock code={`const [count, setCount] = createSignal(0);

const track = createReaction(() => {
  console.log('count changed!');
});

// Arm the reaction: track count()
track(() => count());

setCount(1); // Logs: "count changed!"
setCount(2); // Nothing, reaction was consumed

// Re-arm
track(() => count());
setCount(3); // Logs: "count changed!"`} />
    </>
  );
};

export default CreateReaction;
