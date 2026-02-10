import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const Untrack: Component = () => {
  return (
    <>
      <h1>untrack</h1>
      <p class="docs-description">
        Reads signals without creating reactive dependencies.
      </p>

      <DocCodeBlock code={`const value = untrack(() => signal());`} />

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature name="untrack" signature="untrack<T>(fn: () => T): T" />

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
              <code>() =&gt; T</code>
            </td>
            <td>
              Function to run without tracking. Signal reads inside won't
              register dependencies.
            </td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`createEffect(() => {
  // Re-runs when a() changes, but NOT when b() changes
  console.log(a(), untrack(() => b()));
});`}
      />
    </>
  );
};

export default Untrack;
