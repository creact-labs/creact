import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const CreateReaction: Component = () => {
  return (
    <>
      <h1>createReaction</h1>
      <p class="docs-description">
        Separates tracking from execution. Track one expression, run a different
        function when it changes. The reaction fires once, then must be
        re-armed.
      </p>

      <ApiReference
        name="createReaction"
        signature="createReaction(onInvalidate: () => void, options?: EffectOptions): (tracking: () => void) => void"
        parameters={[
          [<><code>onInvalidate</code></>, <><code>() =&gt; void</code></>, "Callback that fires once when tracked signals change."],
          [<><code>options</code></>, <><code>EffectOptions</code></>, <>Optional. <code>name</code> for debugging.</>],
        ]}
        returns={
          <>
      <p>
        A function <code>(tracking: () =&gt; void) =&gt; void</code> that arms
        the reaction. Call it with a tracking expression. Signals read inside
        are tracked. When any of them change, <code>onInvalidate</code> fires
        once and tracking stops until you call the function again.
      </p>
          </>
        }
      />

      <UsageSection
        code={`const [count, setCount] = createSignal(0);

const track = createReaction(() => {
  console.log('count changed!');
});

// Arm the reaction: track count()
track(() => count());

setCount(1); // Logs: "count changed!"
setCount(2); // Nothing, reaction was consumed

// Re-arm
track(() => count());
setCount(3); // Logs: "count changed!"`}
      />
    </>
  );
};

export default CreateReaction;
