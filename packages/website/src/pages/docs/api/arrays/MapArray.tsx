import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const MapArray: Component = () => {
  return (
    <>
      <h1>mapArray</h1>
      <p class="docs-description">
        Keyed iteration. Each item maps once and is keyed by identity. Only new
        or removed items cause re-computation.
      </p>

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="mapArray"
        signature="mapArray<T, U>(list: Accessor<readonly T[] | undefined | null | false>, mapFn: (v: Accessor<T>, i: Accessor<number>) => U, options?: { fallback?: Accessor<any>; keyFn?: (item: T) => any }): () => U[]"
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
              <code>
                (v: Accessor&lt;T&gt;, i: Accessor&lt;number&gt;) =&gt; U
              </code>
            </td>
            <td>
              Map function. <code>v</code> is an accessor to the item.{" "}
              <code>i</code> is a reactive index.
            </td>
          </tr>
          <tr>
            <td>
              <code>options</code>
            </td>
            <td>
              <code>
                {"{"} fallback?: Accessor; keyFn?: (item: T) =&gt; any {"}"}
              </code>
            </td>
            <td>
              Optional. <code>keyFn</code> provides stable identity for items.
            </td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`const [items, setItems] = createSignal([
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
]);

const names = mapArray(items, (item, i) => {
  // item is an accessor, called once per item, not re-called when item moves
  return item().name.toUpperCase();
});

console.log(names()); // ['ALPHA', 'BETA']`}
      />
    </>
  );
};

export default MapArray;
