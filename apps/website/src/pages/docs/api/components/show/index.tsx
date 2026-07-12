import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import DocTable from "@/shared/components/doc-table";

const ShowApi: Component = () => {
  return (
    <>
      <h1>Show</h1>
      <p class="docs-description">
        Conditionally renders children based on a reactive condition.
      </p>

      <DocCodeBlock
        code={`<Show when={() => isReady()} fallback={<Loading />}>
  <App />
</Show>`}
      />

      <ApiReference
        name="Show"
        signature="Show<T>(props: { when: MaybeAccessor<T | undefined | null | false>; fallback?: MaybeAccessor<CReactNode>; children: CReactNode | ((item: Accessor<NonNullable<T>>) => CReactNode) }): JSXElement"
      />

      <DocHeading level={3} id="props">
        Props
      </DocHeading>
      <DocTable
        headers={["Prop", "Type", "Description"]}
        rows={[
          [<><code>when</code></>, <><code>MaybeAccessor&lt;T | undefined | null | false&gt;</code></>, "Reactive condition. Children render when truthy. Accepts a value or an accessor."],
          [<><code>fallback</code></>, <><code>MaybeAccessor&lt;CReactNode&gt;</code></>, <>Optional content to render when <code>when</code> is falsy.</>],
          [<><code>children</code></>, <><code>
                CReactNode | ((item: Accessor&lt;NonNullable&lt;T&gt;&gt;) =&gt;
                CReactNode)
              </code></>, "Content to render, or a callback receiving the truthy value as an accessor."],
        ]}
      />

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>

      <DocHeading level={3} id="basic">
        Basic Condition
      </DocHeading>
      <DocCodeBlock
        code={`<Show when={() => enabled()}>
  <Server port={3000} />
</Show>`}
      />

      <DocHeading level={3} id="callback">
        Callback Children
      </DocHeading>
      <DocCodeBlock
        code={`<Show when={() => user()}>
  {(u) => <Profile name={u().name} email={u().email} />}
</Show>`}
      />

      <DocHeading level={3} id="fallback">
        With Fallback
      </DocHeading>
      <DocCodeBlock
        code={`<Show when={() => data()} fallback={<Placeholder />}>
  {(d) => <Display data={d()} />}
</Show>`}
      />
    </>
  );
};

export default ShowApi;
