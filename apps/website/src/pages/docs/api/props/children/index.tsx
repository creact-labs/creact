import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

const Children: Component = () => {
  return (
    <>
      <h1>children</h1>
      <p class="docs-description">
        Resolves children passed to a component into a reactive accessor.
        Handles lazy children and arrays.
      </p>

      <DocCodeBlock code={`const resolved = children(() => props.children);`} />

      <ApiReference
        name="children"
        signature="children(fn: Accessor<JSXElement>): ChildrenReturn"
        parameters={[
          [<><code>fn</code></>, <><code>Accessor&lt;JSXElement&gt;</code></>, "Accessor that returns the children prop."],
        ]}
        returns={
          <>
      <p>
        A <code>ChildrenReturn</code>, a callable accessor that returns the
        resolved children. Also has a <code>toArray()</code> method that returns
        the resolved children as a flat array.
      </p>
          </>
        }
      />

      <UsageSection
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
