import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import DocTable from "@/shared/components/doc-table";

const IndexArray: Component = () => {
  return (
    <>
      <h1>indexArray</h1>
      <p class="docs-description">
        Indexed iteration. Each position is a reactive accessor. Best for
        primitive arrays.
      </p>

      <ApiReference
        name="indexArray"
        signature="indexArray<T, U>(list: Accessor<readonly T[] | undefined | null | false>, mapFn: (v: Accessor<T>, i: number) => U, options?: { fallback?: Accessor<any> }): () => U[]"
        parameters={[
          [<><code>list</code></>, <><code>
                Accessor&lt;readonly T[] | undefined | null | false&gt;
              </code></>, "Reactive array source."],
          [<><code>mapFn</code></>, <><code>(v: Accessor&lt;T&gt;, i: number) =&gt; U</code></>, <>Map function. <code>v</code> is an accessor (reactive).{" "}
              <code>i</code> is a static index.</>],
        ]}
      />

      <UsageSection
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
