import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import ApiSignature from "../../../../components/docs/ApiSignature";

const MergeProps: Component = () => {
  return (
    <>
      <h1>mergeProps</h1>
      <p class="docs-description">
        Merges multiple props objects reactively, with later sources overriding
        earlier ones. Use for default props.
      </p>

      <DocCodeBlock
        code={`const merged = mergeProps({ color: 'blue', size: 'md' }, props);`}
      />

      <DocHeading level={2} id="reference">
        Reference
      </DocHeading>
      <ApiSignature
        name="mergeProps"
        signature="mergeProps<T extends object[]>(...sources: T): MergeProps<T>"
      />

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        code={`function Button(props: { color?: string; size?: string; label: string }) {
  const merged = mergeProps({ color: 'blue', size: 'md' }, props);

  createEffect(() => {
    console.log(merged.color, merged.size, merged.label);
  });

  return <></>;
}`}
      />
    </>
  );
};

export default MergeProps;
