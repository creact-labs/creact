import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const Unwrap: Component = () => {
  return (
    <>
      <h1>unwrap</h1>
      <p class="docs-description">
        Returns a deep clone of the underlying data from a store proxy,
        stripping all reactivity.
      </p>

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature name="unwrap" signature="unwrap<T>(store: T): T" />

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
              <code>store</code>
            </td>
            <td>
              <code>T</code>
            </td>
            <td>
              A store proxy created by <code>createStore</code>.
            </td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
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
