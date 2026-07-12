import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";
import DocTable from "@/shared/components/doc-table";

const CreateRenderEffect: Component = () => {
  return (
    <>
      <h1>createRenderEffect</h1>
      <p class="docs-description">
        Runs a function synchronously during render instead of queuing it. Used
        internally by the runtime; rarely needed in application code.
      </p>

      <ApiReference
        name="createRenderEffect"
        signature="createRenderEffect<Next, Init = Next>(fn: (v: Init | Next) => Next, value?: Init, options?: EffectOptions): void"
        parameters={[
          [<><code>fn</code></>, <><code>(v: Init | Next) =&gt; Next</code></>, "Effect function. Runs immediately during render."],
          [<><code>value</code></>, <><code>Init</code></>, "Optional initial value."],
          [<><code>options</code></>, <><code>EffectOptions</code></>, <>Optional. <code>name</code> for debugging.</>],
        ]}
      />

      <UsageSection
        code={`createRenderEffect(() => {
  // Runs synchronously during component initialization
  // and again whenever dependencies change
  console.log('Render-phase:', value());
});`}
      />

      <Callout type="info">
        <p>
          Render effects run before user effects (<code>createEffect</code>).
          Use this when you need synchronous reactions during the render phase,
          such as component render tracking.
        </p>
      </Callout>
    </>
  );
};

export default CreateRenderEffect;
