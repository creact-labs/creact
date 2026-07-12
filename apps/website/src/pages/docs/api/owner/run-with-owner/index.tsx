import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";
import DocTable from "@/shared/components/doc-table";

const RunWithOwner: Component = () => {
  return (
    <>
      <h1>runWithOwner</h1>
      <p class="docs-description">
        Runs a function under a specific reactive owner. Required for creating
        effects in async callbacks.
      </p>

      <ApiReference
        name="runWithOwner"
        signature="runWithOwner<T>(owner: Owner | null, fn: () => T): T | undefined"
        parameters={[
          [<><code>owner</code></>, <><code>Owner | null</code></>, <>The owner scope to run under. Get this from{" "}
              <code>getOwner()</code>. Accepts <code>null</code>.</>],
          [<><code>fn</code></>, <><code>() =&gt; T</code></>, <>Function to run. Any effects/cleanups created inside are owned by{" "}
              <code>owner</code>.</>],
        ]}
      />

      <UsageSection
        code={`import { getOwner, runWithOwner, createEffect } from '@creact-labs/creact';

function setup() {
  // getOwner() returns Owner | null — null outside a reactive scope
  const owner = getOwner();
  if (!owner) return; // nothing to restore later

  setTimeout(() => {
    // Without runWithOwner, this effect would have no owner
    runWithOwner(owner, () => {
      createEffect(() => {
        console.log('Works in async context');
      });
    });
  }, 1000);
}`}
      />

      <Callout type="info">
        <p>
          After <code>await</code> or inside callbacks, the reactive owner is
          lost. Capture it synchronously with <code>getOwner()</code> and
          restore it with
          <code>runWithOwner()</code>.
        </p>
      </Callout>
    </>
  );
};

export default RunWithOwner;
