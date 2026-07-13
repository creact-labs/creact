import type { Component } from "solid-js";
import { t } from "@/i18n";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import RichText from "@/shared/components/rich-text";

const Tsconfig: Component = () => {
  return (
    <>
      <h1>{t("docs.api.config.tsconfig.title")}</h1>
      <p class="docs-description">{t("docs.api.config.tsconfig.description")}</p>

      <DocHeading level={2} id="recommended">
        {t("docs.api.config.tsconfig.heading_recommended")}
      </DocHeading>
      <DocCodeBlock
        lang="json"
        code={t("docs.api.config.tsconfig.code_recommended")}
        filename={t("docs.api.config.tsconfig.filename_tsconfig")}
      />

      <DocHeading level={2} id="key-settings">
        {t("docs.api.config.tsconfig.heading_key_settings")}
      </DocHeading>
      <DocTable
        headers={[
          t("docs.api.config.tsconfig.table_header_setting"),
          t("docs.api.config.tsconfig.table_header_value"),
          t("docs.api.config.tsconfig.table_header_why"),
        ]}
        rows={[
          [
            <RichText k="docs.api.config.tsconfig.row_jsx_name" />,
            <RichText k="docs.api.config.tsconfig.row_jsx_value" />,
            <RichText k="docs.api.config.tsconfig.row_jsx_why" />,
          ],
          [
            <RichText k="docs.api.config.tsconfig.row_jsx_import_source_name" />,
            <RichText k="docs.api.config.tsconfig.row_jsx_import_source_value" />,
            <RichText k="docs.api.config.tsconfig.row_jsx_import_source_why" />,
          ],
          [
            <RichText k="docs.api.config.tsconfig.row_target_name" />,
            <RichText k="docs.api.config.tsconfig.row_target_value" />,
            <RichText k="docs.api.config.tsconfig.row_target_why" />,
          ],
          [
            <RichText k="docs.api.config.tsconfig.row_module_name" />,
            <RichText k="docs.api.config.tsconfig.row_module_value" />,
            <RichText k="docs.api.config.tsconfig.row_module_why" />,
          ],
          [
            <RichText k="docs.api.config.tsconfig.row_module_resolution_name" />,
            <RichText k="docs.api.config.tsconfig.row_module_resolution_value" />,
            <RichText k="docs.api.config.tsconfig.row_module_resolution_why" />,
          ],
        ]}
      />

      <Callout type="info">
        <p>
          <RichText k="docs.api.config.tsconfig.info_tsx" />
        </p>
      </Callout>
    </>
  );
};

export default Tsconfig;
