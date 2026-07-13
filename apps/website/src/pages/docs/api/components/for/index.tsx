import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-tour/src/components/for.tsx";

const ForApi: Component = () => {
  return (
    <>
      <h1>{t("docs.api.components.for.title")}</h1>
      <p class="docs-description">
        {t("docs.api.components.for.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.components.for.title")}
        signature={t("docs.api.components.for.signature")}
      />

      <DocHeading level={3} id="props">
        {t("docs.api.components.for.heading_props")}
      </DocHeading>
      <DocTable
        headers={[
          t("docs.ui.prop_table.prop"),
          t("docs.ui.prop_table.type"),
          t("docs.ui.prop_table.description"),
        ]}
        rows={[
          [
            <RichText k="docs.api.components.for.prop_each_name" />,
            <RichText k="docs.api.components.for.prop_each_type" />,
            <RichText k="docs.api.components.for.prop_each_desc" />,
          ],
          [
            <RichText k="docs.api.components.for.prop_fallback_name" />,
            <RichText k="docs.api.components.for.prop_fallback_type" />,
            <RichText k="docs.api.components.for.prop_fallback_desc" />,
          ],
          [
            <RichText k="docs.api.components.for.prop_keyfn_name" />,
            <RichText k="docs.api.components.for.prop_keyfn_type" />,
            <RichText k="docs.api.components.for.prop_keyfn_desc" />,
          ],
          [
            <RichText k="docs.api.components.for.prop_children_name" />,
            <RichText k="docs.api.components.for.prop_children_type" />,
            <RichText k="docs.api.components.for.prop_children_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default ForApi;
