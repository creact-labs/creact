import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";
import DocTable from "@/shared/components/doc-table";

const ForApi: Component = () => {
  return (
    <>
      <h1>For</h1>
      <p class="docs-description">
        Renders a list of items reactively. Items are keyed by reference. Only
        changed items update.
      </p>

      <DocCodeBlock
        code={`<For each={() => items()}>
  {(item) => <Item data={item()} />}
</For>`}
      />

      <ApiReference
        name="For"
        signature="For<T, U>(props: { each: MaybeAccessor<readonly T[] | undefined | null | false>; fallback?: MaybeAccessor<CReactNode>; keyFn?: (item: T) => any; children: (item: Accessor<T>, index: Accessor<number>) => U }): JSXElement"
      />

      <DocHeading level={3} id="props">
        Props
      </DocHeading>
      <DocTable
        headers={["Prop", "Type", "Description"]}
        rows={[
          [<><code>each</code></>, <><code>
                MaybeAccessor&lt;readonly T[] | undefined | null | false&gt;
              </code></>, "Reactive array to iterate over. Accepts a value or an accessor."],
          [<><code>fallback</code></>, <><code>MaybeAccessor&lt;CReactNode&gt;</code></>, "Optional content when the list is empty."],
          [<><code>keyFn</code></>, <><code>(item: T) =&gt; any</code></>, "Optional key function for stable item identity."],
          [<><code>children</code></>, <><code>
                (item: Accessor&lt;T&gt;, index: Accessor&lt;number&gt;) =&gt; U
              </code></>, <>Render function. <code>item</code> and <code>index</code> are
              accessors.</>],
        ]}
      />

      <UsageSection
        code={`const [sites, setSites] = createSignal([
  { name: 'blog', html: '<h1>Blog</h1>' },
  { name: 'docs', html: '<h1>Docs</h1>' },
]);

<For each={() => sites()}>
  {(site, index) => (
    <WebSite
      name={() => site().name}
      content={() => site().html}
    />
  )}
</For>`}
      />
    </>
  );
};

export default ForApi;
