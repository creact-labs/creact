import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";
import Callout from "../../../../components/docs/Callout";

const CreateRenderEffect: Component = () => {
  return (
    <>
      <h1>createRenderEffect</h1>
      <p class="docs-description">
        Runs a function synchronously during render instead of queuing it. Used
        internally by the runtime; rarely needed in application code.
      </p>

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="createRenderEffect"
        signature="createRenderEffect<Next, Init = Next>(fn: (v: Init | Next) => Next, value?: Init, options?: EffectOptions): void"
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
              <code>(v: Init | Next) =&gt; Next</code>
            </td>
            <td>Effect function. Runs immediately during render.</td>
          </tr>
          <tr>
            <td>
              <code>value</code>
            </td>
            <td>
              <code>Init</code>
            </td>
            <td>Optional initial value.</td>
          </tr>
          <tr>
            <td>
              <code>options</code>
            </td>
            <td>
              <code>EffectOptions</code>
            </td>
            <td>
              Optional. <code>name</code> for debugging.
            </td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
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
