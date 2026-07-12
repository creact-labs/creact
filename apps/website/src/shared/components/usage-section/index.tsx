import type { Component, JSXElement } from "solid-js";
import { t } from "@/i18n";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

interface UsageSectionProps {
  /** The example source code */
  code: string;
  /** Optional filename badge on the code block */
  filename?: string;
  /** Extra prose or callouts rendered after the example */
  children?: JSXElement;
}

/**
 * The standard "Usage" block of an API page: heading plus example code.
 */
const UsageSection: Component<UsageSectionProps> = (props) => {
  return (
    <>
      <DocHeading level={2} id="usage">
        {t("docs.usage")}
      </DocHeading>
      <DocCodeBlock code={props.code} filename={props.filename} />
      {props.children}
    </>
  );
};

export default UsageSection;
