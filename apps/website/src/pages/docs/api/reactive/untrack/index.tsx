import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import DocTable from "@/shared/components/doc-table";

const Untrack: Component = () => {
  return (
    <>
      <h1>untrack</h1>
      <p class="docs-description">
        Reads signals without creating reactive dependencies.
      </p>

      <DocCodeBlock code={`const value = untrack(() => signal());`} />

      <ApiReference
        name="untrack"
        signature="untrack<T>(fn: () => T): T"
        parameters={[
          [<><code>fn</code></>, <><code>() =&gt; T</code></>, "Function to run without tracking. Signal reads inside won't register dependencies."],
        ]}
      />

      <UsageSection
        code={`createEffect(() => {
  // Re-runs when a() changes, but NOT when b() changes
  console.log(a(), untrack(() => b()));
});`}
      />
    </>
  );
};

export default Untrack;
