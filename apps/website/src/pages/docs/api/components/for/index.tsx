import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import TextLink from "@/shared/components/text-link";

const ForApi: Component = () => {
  return (
    <>
      <h1>{t("docs.api.components.for.title")}</h1>
      <p class="docs-description">
        {t("docs.api.components.for.description")}
      </p>

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
            <Trans
              k="docs.api.components.for.prop_each_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.for.prop_each_type"
              components={[Code]}
            />,
            <Trans k="docs.api.components.for.prop_each_desc" />,
          ],
          [
            <Trans
              k="docs.api.components.for.prop_fallback_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.for.prop_fallback_type"
              components={[Code]}
            />,
            <Trans k="docs.api.components.for.prop_fallback_desc" />,
          ],
          [
            <Trans
              k="docs.api.components.for.prop_keyfn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.for.prop_keyfn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.components.for.prop_keyfn_desc" />,
          ],
          [
            <Trans
              k="docs.api.components.for.prop_children_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.for.prop_children_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.components.for.prop_children_desc"
              components={[Code, Code]}
            />,
          ],
        ]}
      />

      <DocHeading level={2} id="usage">
        {t("docs.api.components.for.heading_usage")}
      </DocHeading>

      <DocHeading level={3} id="static-list">
        {t("docs.api.components.for.heading_static_list")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.components.for.static_list_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample("uptime-monitor/src/app.tsx", "layout")}
        filename={t("docs.api.components.for.filename_uptime_app")}
      />

      <DocHeading level={3} id="reactive-list">
        {t("docs.api.components.for.heading_reactive_list")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.components.for.reactive_list_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample("page-writer/src/app.tsx", "hero")}
        filename={t("docs.api.components.for.filename_page_writer_app")}
      />

      <p>
        <Trans
          k="docs.api.components.for.in_the_wild"
          components={[
            (props) => (
              <TextLink href="#/docs/examples/uptime-monitor">
                {props.children}
              </TextLink>
            ),
            (props) => (
              <TextLink href="#/docs/examples/page-writer">
                {props.children}
              </TextLink>
            ),
          ]}
        />
      </p>
    </>
  );
};

export default ForApi;
