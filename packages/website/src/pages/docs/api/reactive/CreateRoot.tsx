import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";
import Callout from "../../../../components/docs/Callout";

const CreateRoot: Component = () => {
  return (
    <>
      <h1>createRoot</h1>
      <p class="docs-description">Creates a reactive root that owns all computations inside it, with a dispose function for teardown.</p>

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="createRoot"
        signature="createRoot<T>(fn: (dispose: () => void) => T, detachedOwner?: Owner): T"
      />

      <DocHeading level={3} id="parameters">Parameters</DocHeading>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>fn</code></td><td><code>(dispose: () =&gt; void) =&gt; T</code></td><td>Function that runs within the root. Receives a dispose function to tear down all owned computations.</td></tr>
          <tr><td><code>detachedOwner</code></td><td><code>Owner</code></td><td>Optional. Parent owner for the root. When provided, the root is attached to this owner's context chain (for lookupContext) but still independently disposable.</td></tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">Returns</DocHeading>
      <p>The return value of <code>fn</code>.</p>

      <DocHeading level={2} id="usage">Usage</DocHeading>

      <DocHeading level={3} id="basic">Basic Root</DocHeading>
      <DocCodeBlock code={`import { createRoot, createSignal, createEffect } from '@creact-labs/creact';

const dispose = createRoot((dispose) => {
  const [count, setCount] = createSignal(0);

  createEffect(() => {
    console.log(count());
  });

  setCount(1);
  return dispose;
});

// Later: tear down all effects and cleanups
dispose();`} />

      <DocHeading level={3} id="testing">In Tests</DocHeading>
      <DocCodeBlock code={`it('signal tracks changes', () => {
  createRoot(() => {
    const [val, setVal] = createSignal(0);
    let observed = -1;
    createEffect(() => { observed = val(); });
    expect(observed).toBe(0);
    setVal(42);
    expect(observed).toBe(42);
  });
});`} />

      <Callout type="info">
        <p>
          <code>render()</code> creates a root automatically. You only need <code>createRoot</code>
          for standalone reactive scopes outside of <code>render()</code>, such as tests.
        </p>
      </Callout>
    </>
  );
};

export default CreateRoot;
