import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import DocTable from "@/shared/components/doc-table";

const OnMount: Component = () => {
  return (
    <>
      <h1>onMount</h1>
      <p class="docs-description">
        Runs a function once when the component initializes, without tracking
        dependencies.
      </p>

      <DocCodeBlock
        code={`onMount(() => {
  console.log('Component mounted');
});`}
      />

      <ApiReference
        name="onMount"
        signature="onMount(fn: () => void): void"
        parameters={[
          [<><code>fn</code></>, <><code>() =&gt; void</code></>, "Function to run once on mount. Runs untracked; signal reads don't create dependencies."],
        ]}
      />

      <UsageSection
        code={`function App() {
  onMount(() => {
    console.log('App started');
  });

  return <></>;
}`}
      />
    </>
  );
};

export default OnMount;
