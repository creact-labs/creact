import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import TextLink from "@/shared/components/text-link";

const ShowApi: Component = () => {
  return (
    <>
      <h1>{t("docs.api.components.show.title")}</h1>
      <p class="docs-description">
        {t("docs.api.components.show.description")}
      </p>

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
      <p>
        <Trans
          k="docs.api.components.show.usage_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample("uptime-monitor/src/app.tsx", "layout")}
        filename={t("docs.api.components.show.filename_app")}
      />

      <p>
        <Trans
          k="docs.api.components.show.in_the_wild"
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

export default ShowApi;
