import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import UsageSection from "@/shared/components/usage-section";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import ApiSignature from "@/shared/components/api-signature";

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

      <ApiReference
        name="mergeProps"
        signature="mergeProps<T extends object[]>(...sources: T): MergeProps<T>"
      />

      <UsageSection
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
