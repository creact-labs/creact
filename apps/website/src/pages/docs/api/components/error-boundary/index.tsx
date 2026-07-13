import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/components/error-boundary.tsx";

const ErrorBoundaryApi: Component = () => {
  return (
    <>
      <h1>{t("docs.api.components.error_boundary.title")}</h1>
      <p class="docs-description">
        {t("docs.api.components.error_boundary.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.components.error_boundary.title")}
        signature={t("docs.api.components.error_boundary.signature")}
      />

      <DocHeading level={3} id="props">
        {t("docs.api.components.error_boundary.heading_props")}
      </DocHeading>
      <DocTable
        headers={[
          t("docs.ui.prop_table.prop"),
          t("docs.ui.prop_table.type"),
          t("docs.ui.prop_table.description"),
        ]}
        rows={[
          [
            <RichText k="docs.api.components.error_boundary.prop_fallback_name" />,
            <RichText k="docs.api.components.error_boundary.prop_fallback_type" />,
            <RichText k="docs.api.components.error_boundary.prop_fallback_desc" />,
          ],
          [
            <RichText k="docs.api.components.error_boundary.prop_children_name" />,
            <RichText k="docs.api.components.error_boundary.prop_children_type" />,
            <RichText k="docs.api.components.error_boundary.prop_children_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default ErrorBoundaryApi;
