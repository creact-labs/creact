import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const GetOwner: Component = () => {
  return (
    <>
      <h1>getOwner</h1>
      <p class="docs-description">
        Returns the current reactive owner (the computation or root that owns
        the current scope).
      </p>

      <ApiReference
        name="getOwner"
        signature="getOwner(): Owner | null"
        returns={
          <>
      <p>
        The current <code>Owner</code>, or <code>null</code> if called outside a
        reactive scope.
      </p>
          </>
        }
      />

      <UsageSection
        code={`const owner = getOwner();
// Use with runWithOwner to restore ownership context
// in async callbacks or event handlers`}
      />
    </>
  );
};

export default GetOwner;
