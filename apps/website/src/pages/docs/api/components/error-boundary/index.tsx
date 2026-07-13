import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import TextLink from "@/shared/components/text-link";

const app = "uptime-monitor/src/app.tsx";

const ErrorBoundaryApi: Component = () => {
  return (
    <>
      <h1>{t("docs.api.components.error_boundary.title")}</h1>
      <p class="docs-description">
        {t("docs.api.components.error_boundary.description")}
      </p>

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
            <Trans
              k="docs.api.components.error_boundary.prop_fallback_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.error_boundary.prop_fallback_type"
              components={[Code]}
            />,
            <Trans k="docs.api.components.error_boundary.prop_fallback_desc" />,
          ],
          [
            <Trans
              k="docs.api.components.error_boundary.prop_children_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.error_boundary.prop_children_type"
              components={[Code]}
            />,
            <Trans k="docs.api.components.error_boundary.prop_children_desc" />,
          ],
        ]}
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="guarding-the-sweep">
        {t("docs.api.components.error_boundary.heading_guarding_the_sweep")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.components.error_boundary.usage_guarding_the_sweep"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "layout")}
        filename={t("docs.api.components.error_boundary.filename_app")}
      />

      <DocHeading level={3} id="rendering-the-fault">
        {t("docs.api.components.error_boundary.heading_rendering_the_fault")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.components.error_boundary.usage_rendering_the_fault"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "monitor-fault")}
        filename={t("docs.api.components.error_boundary.filename_app")}
      />

      <p>
        <Trans
          k="docs.api.components.error_boundary.in_the_wild"
          components={[
            (props) => (
              <TextLink href="#/docs/examples/uptime-monitor">
                {props.children}
              </TextLink>
            ),
          ]}
        />
      </p>
    </>
  );
};

export default ErrorBoundaryApi;
