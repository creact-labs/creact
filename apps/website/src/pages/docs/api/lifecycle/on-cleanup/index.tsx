import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";
import DocTable from "@/shared/components/doc-table";

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

      <ApiReference
        name="onCleanup"
        signature="onCleanup<T extends () => any>(fn: T): T"
        parameters={[
          [<><code>fn</code></>, <><code>() =&gt; any</code></>, "Cleanup function. Called when the owner disposes."],
        ]}
        returns={
          <>
      <p>The same function passed in, for convenience.</p>
          </>
        }
      />

      <UsageSection
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
