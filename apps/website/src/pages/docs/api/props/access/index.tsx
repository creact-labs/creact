import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const Access: Component = () => {
  return (
    <>
      <h1>access</h1>
      <p class="docs-description">
        Unwraps a MaybeAccessor. Calls it if it's a function, returns it
        directly otherwise.
      </p>

      <DocCodeBlock
        code={`const value = access(props.count); // works for both 5 and () => 5`}
      />

      <ApiReference
        name="access"
        signature="access<T>(value: MaybeAccessor<T>): T"
        parameters={[
          [<><code>value</code></>, <><code>T | () =&gt; T</code></>, "A value or an accessor function."],
        ]}
        returns={
          <>
      <p>
        The unwrapped value of type <code>T</code>.
      </p>
          </>
        }
      />

      <UsageSection
        code={`import { access, type MaybeAccessor } from '@creact-labs/creact';

function useConfig(region: MaybeAccessor<string>) {
  // Works whether region is 'us-east-1' or () => 'us-east-1'
  const resolved = access(region);
  return { region: resolved };
}`}
      />
    </>
  );
};

export default Access;
