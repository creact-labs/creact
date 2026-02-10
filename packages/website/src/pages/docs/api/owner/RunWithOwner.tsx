import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";
import Callout from "../../../../components/docs/Callout";

const RunWithOwner: Component = () => {
  return (
    <>
      <h1>runWithOwner</h1>
      <p class="docs-description">
        Runs a function under a specific reactive owner. Required for creating
        effects in async callbacks.
      </p>

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="runWithOwner"
        signature="runWithOwner<T>(owner: Owner | null, fn: () => T): T | undefined"
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
              <code>owner</code>
            </td>
            <td>
              <code>Owner | null</code>
            </td>
            <td>
              The owner scope to run under. Get this from{" "}
              <code>getOwner()</code>. Accepts <code>null</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>fn</code>
            </td>
            <td>
              <code>() =&gt; T</code>
            </td>
            <td>
              Function to run. Any effects/cleanups created inside are owned by{" "}
              <code>owner</code>.
            </td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`import { getOwner, runWithOwner, createEffect } from '@creact-labs/creact';

function setup() {
  const owner = getOwner(); // capture current owner

  setTimeout(() => {
    // Without runWithOwner, this effect would have no owner
    runWithOwner(owner!, () => {
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
