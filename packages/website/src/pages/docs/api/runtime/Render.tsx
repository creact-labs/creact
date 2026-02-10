import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const Render: Component = () => {
  return (
    <>
      <h1>render</h1>
      <p class="docs-description">
        Entry point for CReact applications. Renders the component tree,
        reconciles state, runs handlers.
      </p>

      <DocCodeBlock
        code={`import { render } from '@creact-labs/creact';

export default async function() {
  return render(() => <App />, memory, 'my-app');
}`}
      />

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="render"
        signature="render(fn: () => any, memory: Memory, stackName: string, options?: RenderOptions): RenderResult"
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
            <td>Function that returns the root component tree.</td>
          </tr>
          <tr>
            <td>
              <code>memory</code>
            </td>
            <td>
              <code>Memory</code>
            </td>
            <td>Required. State persistence backend.</td>
          </tr>
          <tr>
            <td>
              <code>stackName</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>Required. Identifier for the state store.</td>
          </tr>
          <tr>
            <td>
              <code>options</code>
            </td>
            <td>
              <code>RenderOptions</code>
            </td>
            <td>Optional. Additional render configuration.</td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">
        Returns
      </DocHeading>
      <p>
        A <code>RenderResult</code> object (synchronous). The <code>ready</code>{" "}
        property is a <code>Promise&lt;void&gt;</code> that resolves when the
        initial deployment completes.
      </p>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`const memory = new FileMemory('./.state');
const result = render(() => <App />, memory, 'my-stack');
await result.ready;`}
      />
    </>
  );
};

export default Render;
