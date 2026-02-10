import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const GetOwner: Component = () => {
  return (
    <>
      <h1>getOwner</h1>
      <p class="docs-description">
        Returns the current reactive owner (the computation or root that owns
        the current scope).
      </p>

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature name="getOwner" signature="getOwner(): Owner | null" />

      <DocHeading level={3} id="returns">
        Returns
      </DocHeading>
      <p>
        The current <code>Owner</code>, or <code>null</code> if called outside a
        reactive scope.
      </p>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`const owner = getOwner();
// Use with runWithOwner to restore ownership context
// in async callbacks or event handlers`}
      />
    </>
  );
};

export default GetOwner;
