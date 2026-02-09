import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const Access: Component = () => {
  return (
    <>
      <h1>access</h1>
      <p class="docs-description">Unwraps a MaybeAccessor. Calls it if it's a function, returns it directly otherwise.</p>

      <DocCodeBlock code={`const value = access(props.count); // works for both 5 and () => 5`} />

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="access"
        signature="access<T>(value: MaybeAccessor<T>): T"
      />

      <DocHeading level={3} id="parameters">Parameters</DocHeading>
      <table>
        <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>value</code></td><td><code>T | () =&gt; T</code></td><td>A value or an accessor function.</td></tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">Returns</DocHeading>
      <p>The unwrapped value of type <code>T</code>.</p>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock code={`import { access, type MaybeAccessor } from '@creact-labs/creact';

function useConfig(region: MaybeAccessor<string>) {
  // Works whether region is 'us-east-1' or () => 'us-east-1'
  const resolved = access(region);
  return { region: resolved };
}`} />
    </>
  );
};

export default Access;
