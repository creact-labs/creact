import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";
import DocTable from "@/shared/components/doc-table";

const CreateEffect: Component = () => {
  return (
    <>
      <h1>createEffect</h1>
      <p class="docs-description">
        Creates a reactive side effect that runs when its dependencies change.
        Use for side effects (logging, external calls). Runs after the current
        batch.
      </p>

      <DocCodeBlock
        code={`createEffect(() => {
  console.log('Count is:', count());
});`}
      />

      <ApiReference
        name="createEffect"
        signature="createEffect<Next, Init = Next>(fn: (v: Init | Next) => Next, value?: Init, options?: EffectOptions): void"
        parameters={[
          [<><code>fn</code></>, <><code>(v: Init | Next) =&gt; Next</code></>, "Effect function. Receives previous return value. Automatically tracked."],
          [<><code>value</code></>, <><code>Init</code></>, "Optional initial value passed to the first run."],
          [<><code>options</code></>, <><code>EffectOptions</code></>, <>Optional. <code>name</code> for debugging.</>],
        ]}
      />

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>

      <DocHeading level={3} id="basic">
        Tracking Dependencies
      </DocHeading>
      <DocCodeBlock
        code={`const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);

createEffect(() => {
  // Re-runs when a() OR b() changes
  console.log(a() + b());
});`}
      />

      <DocHeading level={3} id="with-previous">
        Using Previous Value
      </DocHeading>
      <DocCodeBlock
        code={`createEffect((prev) => {
  const current = count();
  console.log(\`Changed from \${prev} to \${current}\`);
  return current;
}, 0);`}
      />

      <DocHeading level={3} id="cleanup">
        Cleanup with onCleanup
      </DocHeading>
      <DocCodeBlock
        code={`import { createEffect, onCleanup } from '@creact-labs/creact';

createEffect(() => {
  const interval = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(interval));
});`}
      />

      <Callout type="info">
        <p>
          Effects are batched. Multiple synchronous signal updates only trigger
          one re-run. Use <code>batch()</code> explicitly for complex update
          sequences.
        </p>
      </Callout>
    </>
  );
};

export default CreateEffect;
