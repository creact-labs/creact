import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";

const CreateRoot: Component = () => {
  return (
    <>
      <h1>createRoot</h1>
      <p class="docs-description">
        Creates a reactive root that owns all computations inside it, with a
        dispose function for teardown.
      </p>

      <ApiReference
        name="createRoot"
        signature="createRoot<T>(fn: (dispose: () => void) => T, detachedOwner?: Owner): T"
        parameters={[
          [<><code>fn</code></>, <><code>(dispose: () =&gt; void) =&gt; T</code></>, "Function that runs within the root. Receives a dispose function to tear down all owned computations."],
          [<><code>detachedOwner</code></>, <><code>Owner</code></>, "Optional. Parent owner for the root. When provided, the root is attached to this owner's context chain (for lookupContext) but still independently disposable."],
        ]}
        returns={
          <>
      <p>
        The return value of <code>fn</code>.
      </p>
          </>
        }
      />

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>

      <DocHeading level={3} id="basic">
        Basic Root
      </DocHeading>
      <DocCodeBlock
        code={`import { createRoot, createSignal, createEffect } from '@creact-labs/creact';

const dispose = createRoot((dispose) => {
  const [count, setCount] = createSignal(0);

  createEffect(() => {
    console.log(count());
  });

  setCount(1);
  return dispose;
});

// Later: tear down all effects and cleanups
dispose();`}
      />

      <DocHeading level={3} id="testing">
        In Tests
      </DocHeading>
      <DocCodeBlock
        code={`it('signal tracks changes', () => {
  createRoot(() => {
    const [val, setVal] = createSignal(0);
    let observed = -1;
    createEffect(() => { observed = val(); });
    expect(observed).toBe(0);
    setVal(42);
    expect(observed).toBe(42);
  });
});`}
      />

      <Callout type="info">
        <p>
          <code>render()</code> creates a root automatically. You only need{" "}
          <code>createRoot</code>
          for standalone reactive scopes outside of <code>render()</code>, such
          as tests.
        </p>
      </Callout>
    </>
  );
};

export default CreateRoot;
