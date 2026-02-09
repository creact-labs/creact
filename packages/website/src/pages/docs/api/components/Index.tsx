import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";
import Callout from "../../../../components/docs/Callout";

const IndexApi: Component = () => {
  return (
    <>
      <h1>Index</h1>
      <p class="docs-description">Like For, but keyed by index instead of reference. Use when working with primitive values or when the array position matters more than identity.</p>

      <DocHeading level={2} id="reference">Reference</DocHeading>
      <ApiSignature
        name="indexArray"
        signature="indexArray<T, U>(list: Accessor<T[]>, mapFn: (v: Accessor<T>, i: number) => U): Accessor<U[]>"
      />

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock code={`import { indexArray, createSignal } from '@creact-labs/creact';

const [items, setItems] = createSignal(['a', 'b', 'c']);

const mapped = indexArray(items, (item, i) => {
  // item is an accessor, reactive to value changes at this index
  // i is a static number, the index doesn't change
  return { index: i, value: item };
});`} />

      <Callout type="info">
        <p>
          Use <code>For</code> (backed by <code>mapArray</code>) when items have identity.
          Use <code>indexArray</code> when working with primitive lists where the position is
          the key.
        </p>
      </Callout>
    </>
  );
};

export default IndexApi;
