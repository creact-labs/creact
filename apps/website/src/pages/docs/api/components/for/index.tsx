import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/components/for.tsx";

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
            <Trans k="docs.api.components.for.prop_each_name" />,
            <Trans k="docs.api.components.for.prop_each_type" />,
            <Trans k="docs.api.components.for.prop_each_desc" />,
          ],
          [
            <Trans k="docs.api.components.for.prop_fallback_name" />,
            <Trans k="docs.api.components.for.prop_fallback_type" />,
            <Trans k="docs.api.components.for.prop_fallback_desc" />,
          ],
          [
            <Trans k="docs.api.components.for.prop_keyfn_name" />,
            <Trans k="docs.api.components.for.prop_keyfn_type" />,
            <Trans k="docs.api.components.for.prop_keyfn_desc" />,
          ],
          [
            <Trans k="docs.api.components.for.prop_children_name" />,
            <Trans k="docs.api.components.for.prop_children_type" />,
            <Trans k="docs.api.components.for.prop_children_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default ForApi;
