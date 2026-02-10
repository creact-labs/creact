import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

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

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="For"
        signature="For<T, U>(props: { each: MaybeAccessor<readonly T[] | undefined | null | false>; fallback?: MaybeAccessor<CReactNode>; keyFn?: (item: T) => any; children: (item: Accessor<T>, index: Accessor<number>) => U }): JSXElement"
      />

      <DocHeading level={3} id="props">
        Props
      </DocHeading>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>each</code>
            </td>
            <td>
              <code>
                MaybeAccessor&lt;readonly T[] | undefined | null | false&gt;
              </code>
            </td>
            <td>
              Reactive array to iterate over. Accepts a value or an accessor.
            </td>
          </tr>
          <tr>
            <td>
              <code>fallback</code>
            </td>
            <td>
              <code>MaybeAccessor&lt;CReactNode&gt;</code>
            </td>
            <td>Optional content when the list is empty.</td>
          </tr>
          <tr>
            <td>
              <code>keyFn</code>
            </td>
            <td>
              <code>(item: T) =&gt; any</code>
            </td>
            <td>Optional key function for stable item identity.</td>
          </tr>
          <tr>
            <td>
              <code>children</code>
            </td>
            <td>
              <code>
                (item: Accessor&lt;T&gt;, index: Accessor&lt;number&gt;) =&gt; U
              </code>
            </td>
            <td>
              Render function. <code>item</code> and <code>index</code> are
              accessors.
            </td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
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
