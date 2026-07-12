import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import DocTable from "@/shared/components/doc-table";

const Unwrap: Component = () => {
  return (
    <>
      <h1>unwrap</h1>
      <p class="docs-description">
        Returns a deep clone of the underlying data from a store proxy,
        stripping all reactivity.
      </p>

      <ApiReference
        name="unwrap"
        signature="unwrap<T>(store: T): T"
        parameters={[
          [<><code>store</code></>, <><code>T</code></>, <>A store proxy created by <code>createStore</code>.</>],
        ]}
      />

      <UsageSection
        code={`const [store, setStore] = createStore({ count: 0 });
const plain = unwrap(store);

// plain is a regular object, not reactive
console.log(plain); // { count: 0 }

// Useful for serialization
JSON.stringify(unwrap(store));`}
      />
    </>
  );
};

export default Unwrap;
