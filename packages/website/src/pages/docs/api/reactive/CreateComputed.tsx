import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";
import Callout from "../../../../components/docs/Callout";

const CreateComputed: Component = () => {
  return (
    <>
      <h1>createComputed</h1>
      <p class="docs-description">
        Runs a function synchronously during the computation phase, before
        effects. Use when you need to write to other signals as dependencies
        update.
      </p>

      <DocCodeBlock
        code={`createComputed(() => {
  setFullName(\`\${firstName()} \${lastName()}\`);
});`}
      />

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="createComputed"
        signature="createComputed<Next, Init = Next>(fn: (v: Init | Next) => Next, value?: Init, options?: EffectOptions): void"
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
            <td>Computation function. Runs synchronously.</td>
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
        code={`const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');
const [fullName, setFullName] = createSignal('');

createComputed(() => {
  setFullName(\`\${firstName()} \${lastName()}\`);
});

console.log(fullName()); // 'John Doe'`}
      />

      <Callout type="warning">
        <p>
          Prefer <code>createMemo</code> for derived values. Use{" "}
          <code>createComputed</code> only when you need to write to other
          signals synchronously during the computation phase.
        </p>
      </Callout>
    </>
  );
};

export default CreateComputed;
