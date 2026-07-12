import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

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

      <ApiReference
        name="render"
        signature="render(fn: () => any, memory: Memory, stackName: string, options?: RenderOptions): RenderResult"
        parameters={[
          [<><code>fn</code></>, <><code>() =&gt; any</code></>, "Function that returns the root component tree."],
          [<><code>memory</code></>, <><code>Memory</code></>, "Required. State persistence backend."],
          [<><code>stackName</code></>, <><code>string</code></>, "Required. Identifier for the state store."],
          [<><code>options</code></>, <><code>RenderOptions</code></>, "Optional. Additional render configuration."],
        ]}
        returns={
          <>
      <p>
        A <code>RenderResult</code> object (synchronous). The <code>ready</code>{" "}
        property is a <code>Promise&lt;void&gt;</code> that resolves when the
        initial deployment completes.
      </p>
          </>
        }
      />

      <UsageSection
        code={`const memory = new FileMemory('./.state');
const result = render(() => <App />, memory, 'my-stack');
await result.ready;`}
      />
    </>
  );
};

export default Render;
