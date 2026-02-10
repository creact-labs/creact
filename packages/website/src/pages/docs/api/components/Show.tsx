import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

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

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="Show"
        signature="Show<T>(props: { when: MaybeAccessor<T | undefined | null | false>; fallback?: MaybeAccessor<CReactNode>; children: CReactNode | ((item: Accessor<NonNullable<T>>) => CReactNode) }): JSXElement"
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
              <code>when</code>
            </td>
            <td>
              <code>MaybeAccessor&lt;T | undefined | null | false&gt;</code>
            </td>
            <td>
              Reactive condition. Children render when truthy. Accepts a value
              or an accessor.
            </td>
          </tr>
          <tr>
            <td>
              <code>fallback</code>
            </td>
            <td>
              <code>MaybeAccessor&lt;CReactNode&gt;</code>
            </td>
            <td>
              Optional content to render when <code>when</code> is falsy.
            </td>
          </tr>
          <tr>
            <td>
              <code>children</code>
            </td>
            <td>
              <code>
                CReactNode | ((item: Accessor&lt;NonNullable&lt;T&gt;&gt;) =&gt;
                CReactNode)
              </code>
            </td>
            <td>
              Content to render, or a callback receiving the truthy value as an
              accessor.
            </td>
          </tr>
        </tbody>
      </table>

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
