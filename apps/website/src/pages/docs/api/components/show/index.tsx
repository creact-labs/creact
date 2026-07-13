import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";

const samples = "api-cookbook/src/components/show.tsx";

const ShowApi: Component = () => {
  return (
    <>
      <h1>{t("docs.api.components.show.title")}</h1>
      <p class="docs-description">
        {t("docs.api.components.show.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.components.show.title")}
        signature={t("docs.api.components.show.signature")}
      />

      <DocHeading level={3} id="props">
        {t("docs.api.components.show.heading_props")}
      </DocHeading>
      <DocTable
        headers={[
          t("docs.ui.prop_table.prop"),
          t("docs.ui.prop_table.type"),
          t("docs.ui.prop_table.description"),
        ]}
        rows={[
          [
            <Trans
              k="docs.api.components.show.prop_when_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.show.prop_when_type"
              components={[Code]}
            />,
            <Trans k="docs.api.components.show.prop_when_desc" />,
          ],
          [
            <Trans
              k="docs.api.components.show.prop_fallback_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.show.prop_fallback_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.show.prop_fallback_desc"
              components={[Code]}
            />,
          ],
          [
            <Trans
              k="docs.api.components.show.prop_children_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.show.prop_children_type"
              components={[Code]}
            />,
            <Trans k="docs.api.components.show.prop_children_desc" />,
          ],
        ]}
      />

      <DocHeading level={2} id="usage">
        {t("docs.api.components.show.heading_usage")}
      </DocHeading>

      <DocHeading level={3} id="basic">
        {t("docs.api.components.show.heading_basic")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "basic")} />

      <DocHeading level={3} id="callback">
        {t("docs.api.components.show.heading_callback")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "callback")} />

      <DocHeading level={3} id="fallback">
        {t("docs.api.components.show.heading_fallback")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "fallback")} />
    </>
  );
};

export default ShowApi;
