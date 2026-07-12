import type { Component, JSXElement } from "solid-js";
import { Show } from "solid-js";
import { t } from "@/i18n";
import ApiSignature from "@/shared/components/api-signature";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";

interface ApiReferenceProps {
  /** API symbol name shown in the signature block */
  name: string;
  /** Full type signature */
  signature: string;
  /** Parameter rows: [name, type, description] — omit when the API takes none */
  parameters?: JSXElement[][];
  /** Description of the return value */
  returns?: JSXElement;
}

/**
 * The standard "Reference" block of an API page: heading, signature, and
 * the optional parameters table.
 */
const ApiReference: Component<ApiReferenceProps> = (props) => {
  return (
    <>
      <DocHeading level={2} id="reference">
        {t("docs.reference")}
      </DocHeading>
      <ApiSignature name={props.name} signature={props.signature} />
      <Show when={props.parameters}>
        {(parameters) => (
          <>
            <DocHeading level={3} id="parameters">
              {t("docs.parameters")}
            </DocHeading>
            <DocTable
              headers={[
                t("docs.param_table.parameter"),
                t("docs.param_table.type"),
                t("docs.param_table.description"),
              ]}
              rows={parameters()}
            />
          </>
        )}
      </Show>
      <Show when={props.returns !== undefined}>
        <DocHeading level={3} id="returns">
          {t("docs.returns")}
        </DocHeading>
        {props.returns}
      </Show>
    </>
  );
};

export default ApiReference;
