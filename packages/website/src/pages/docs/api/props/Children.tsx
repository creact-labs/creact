import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const Children: Component = () => {
  return (
    <>
      <h1>children</h1>
      <p class="docs-description">
        Resolves children passed to a component into a reactive accessor.
        Handles lazy children and arrays.
      </p>

      <DocCodeBlock code={`const resolved = children(() => props.children);`} />

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="children"
        signature="children(fn: Accessor<JSXElement>): ChildrenReturn"
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
              <code>fn</code>
            </td>
            <td>
              <code>Accessor&lt;JSXElement&gt;</code>
            </td>
            <td>Accessor that returns the children prop.</td>
          </tr>
        </tbody>
      </table>

      <DocHeading level={3} id="returns">
        Returns
      </DocHeading>
      <p>
        A <code>ChildrenReturn</code>, a callable accessor that returns the
        resolved children. Also has a <code>toArray()</code> method that returns
        the resolved children as a flat array.
      </p>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`function Wrapper(props: { children: any }) {
  const c = children(() => props.children);

  createEffect(() => {
    const resolved = c();
    console.log('Children:', resolved);
  });

  return <></>;
}`}
      />
    </>
  );
};

export default Children;
