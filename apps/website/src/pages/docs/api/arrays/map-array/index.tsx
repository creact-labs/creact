import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import DocTable from "@/shared/components/doc-table";

const MapArray: Component = () => {
  return (
    <>
      <h1>mapArray</h1>
      <p class="docs-description">
        Keyed iteration. Each item maps once and is keyed by identity. Only new
        or removed items cause re-computation.
      </p>

      <ApiReference
        name="mapArray"
        signature="mapArray<T, U>(list: Accessor<readonly T[] | undefined | null | false>, mapFn: (v: Accessor<T>, i: Accessor<number>) => U, options?: { fallback?: Accessor<any>; keyFn?: (item: T) => any }): () => U[]"
        parameters={[
          [<><code>list</code></>, <><code>
                Accessor&lt;readonly T[] | undefined | null | false&gt;
              </code></>, "Reactive array source."],
          [<><code>mapFn</code></>, <><code>
                (v: Accessor&lt;T&gt;, i: Accessor&lt;number&gt;) =&gt; U
              </code></>, <>Map function. <code>v</code> is an accessor to the item.{" "}
              <code>i</code> is a reactive index.</>],
          [<><code>options</code></>, <><code>
                {"{"} fallback?: Accessor; keyFn?: (item: T) =&gt; any {"}"}
              </code></>, <>Optional. <code>keyFn</code> provides stable identity for items.</>],
        ]}
      />

      <UsageSection
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
