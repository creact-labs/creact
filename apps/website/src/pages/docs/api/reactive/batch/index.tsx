import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const Batch: Component = () => {
  return (
    <>
      <h1>batch</h1>
      <p class="docs-description">
        Groups multiple signal updates into a single computation pass.
      </p>

      <DocCodeBlock
        code={`batch(() => {
  setA(1);
  setB(2);
  setC(3);
}); // Effects run once, not three times`}
      />

      <ApiReference
        name="batch"
        signature="batch<T>(fn: () => T): T"
        parameters={[
          [<><code>fn</code></>, <><code>() =&gt; T</code></>, "Function containing signal updates. All updates are deferred until the function completes."],
        ]}
        returns={
          <>
      <p>
        The return value of <code>fn</code>.
      </p>
          </>
        }
      />

      <UsageSection
        code={`const [firstName, setFirstName] = createSignal('');
const [lastName, setLastName] = createSignal('');

createEffect(() => {
  // Only runs once per batch, not twice
  console.log(\`\${firstName()} \${lastName()}\`);
});

batch(() => {
  setFirstName('John');
  setLastName('Doe');
}); // Logs: "John Doe" (once)`}
      />
    </>
  );
};

export default Batch;
