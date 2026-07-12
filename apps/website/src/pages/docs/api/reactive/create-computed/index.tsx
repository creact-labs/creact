import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";
import DocTable from "@/shared/components/doc-table";

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

      <ApiReference
        name="createComputed"
        signature="createComputed<Next, Init = Next>(fn: (v: Init | Next) => Next, value?: Init, options?: EffectOptions): void"
        parameters={[
          [<><code>fn</code></>, <><code>(v: Init | Next) =&gt; Next</code></>, "Computation function. Runs synchronously."],
          [<><code>value</code></>, <><code>Init</code></>, "Optional initial value."],
          [<><code>options</code></>, <><code>EffectOptions</code></>, <>Optional. <code>name</code> for debugging.</>],
        ]}
      />

      <UsageSection
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
