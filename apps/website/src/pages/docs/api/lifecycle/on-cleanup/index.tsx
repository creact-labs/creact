import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";

const OnCleanup: Component = () => {
  return (
    <>
      <h1>onCleanup</h1>
      <p class="docs-description">
        Registers a cleanup function on the current reactive owner. Runs when
        the owner is disposed or before an effect re-runs.
      </p>

      <DocCodeBlock
        code={`onCleanup(() => {
  clearInterval(interval);
});`}
      />

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="onCleanup"
        signature="onCleanup<T extends () => any>(fn: T): T"
      />

      <DocHeading level={3} id="parameters">
        Parameters
      </DocHeading>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>fn</code>
            </td>
            <td>
              <code>() =&gt; any</code>
            </td>
            <td>Cleanup function. Called when the owner disposes.</td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">
        Returns
      </DocHeading>
      <p>The same function passed in, for convenience.</p>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`createEffect(() => {
  const interval = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(interval));
  // interval is cleared before the next run, or when disposed
});`}
      />

      <Callout type="warning">
        <p>
          <code>onCleanup</code> called outside a <code>createRoot</code> or{" "}
          <code>render</code>
          will warn and the cleanup will never run.
        </p>
      </Callout>
    </>
  );
};

export default OnCleanup;
