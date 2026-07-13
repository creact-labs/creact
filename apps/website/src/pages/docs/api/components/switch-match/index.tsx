import type { Component } from "solid-js";
import { t } from "@/i18n";
import ApiReference from "@/shared/components/api-reference";
import ApiSignature from "@/shared/components/api-signature";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const SwitchMatch: Component = () => {
  return (
    <>
      <h1>{t("docs.api.components.switch_match.title")}</h1>
      <p class="docs-description">
        {t("docs.api.components.switch_match.description")}
      </p>

      <DocCodeBlock code={t("docs.api.components.switch_match.code_hero")} />

      <ApiReference
        name={t("docs.api.components.switch_match.name_switch")}
        signature={t("docs.api.components.switch_match.signature_switch")}
      />
      <ApiSignature
        name={t("docs.api.components.switch_match.name_match")}
        signature={t("docs.api.components.switch_match.signature_match")}
      />

      <DocHeading level={3} id="props">
        {t("docs.api.components.switch_match.heading_props")}
      </DocHeading>
      <p>
        <strong>{t("docs.api.components.switch_match.name_switch")}</strong>
      </p>
      <DocTable
        headers={[
          t("docs.ui.prop_table.prop"),
          t("docs.ui.prop_table.type"),
          t("docs.ui.prop_table.description"),
        ]}
        rows={[
          [
            <RichText k="docs.api.components.switch_match.switch_prop_fallback_name" />,
            <RichText k="docs.api.components.switch_match.switch_prop_fallback_type" />,
            <RichText k="docs.api.components.switch_match.switch_prop_fallback_desc" />,
          ],
          [
            <RichText k="docs.api.components.switch_match.switch_prop_children_name" />,
            <RichText k="docs.api.components.switch_match.switch_prop_children_type" />,
            <RichText k="docs.api.components.switch_match.switch_prop_children_desc" />,
          ],
        ]}
      />
      <p>
        <strong>{t("docs.api.components.switch_match.name_match")}</strong>
      </p>
      <DocTable
        headers={[
          t("docs.ui.prop_table.prop"),
          t("docs.ui.prop_table.type"),
          t("docs.ui.prop_table.description"),
        ]}
        rows={[
          [
            <RichText k="docs.api.components.switch_match.match_prop_when_name" />,
            <RichText k="docs.api.components.switch_match.match_prop_when_type" />,
            <RichText k="docs.api.components.switch_match.match_prop_when_desc" />,
          ],
          [
            <RichText k="docs.api.components.switch_match.match_prop_children_name" />,
            <RichText k="docs.api.components.switch_match.match_prop_children_type" />,
            <RichText k="docs.api.components.switch_match.match_prop_children_desc" />,
          ],
        ]}
      />

      <UsageSection code={t("docs.api.components.switch_match.code_usage")} />
    </>
  );
};

export default SwitchMatch;
