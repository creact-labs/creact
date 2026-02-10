import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const IndexArray: Component = () => {
  return (
    <>
      <h1>indexArray</h1>
      <p class="docs-description">
        Indexed iteration. Each position is a reactive accessor. Best for
        primitive arrays.
      </p>

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="indexArray"
        signature="indexArray<T, U>(list: Accessor<readonly T[] | undefined | null | false>, mapFn: (v: Accessor<T>, i: number) => U, options?: { fallback?: Accessor<any> }): () => U[]"
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
              <code>list</code>
            </td>
            <td>
              <code>
                Accessor&lt;readonly T[] | undefined | null | false&gt;
              </code>
            </td>
            <td>Reactive array source.</td>
          </tr>
          <tr>
            <td>
              <code>mapFn</code>
            </td>
            <td>
              <code>(v: Accessor&lt;T&gt;, i: number) =&gt; U</code>
            </td>
            <td>
              Map function. <code>v</code> is an accessor (reactive).{" "}
              <code>i</code> is a static index.
            </td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`const [names, setNames] = createSignal(['Alice', 'Bob', 'Charlie']);

const upper = indexArray(names, (name, i) => {
  // name is an accessor, reactive to changes at index i
  return { index: i, value: name };
});`}
      />
    </>
  );
};

export default IndexArray;
