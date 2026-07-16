import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";

const Intro: Component = () => (
  <>
    <h1>{t("docs.api.config.tsconfig.title")}</h1>
    <p class="docs-description">{t("docs.api.config.tsconfig.description")}</p>
  </>
);

const RecommendedSection: Component = () => (
  <>
    <DocHeading level={2} id="recommended">
      {t("docs.api.config.tsconfig.heading_recommended")}
    </DocHeading>
    <DocCodeBlock
      lang="json"
      code={t("docs.api.config.tsconfig.code_recommended")}
      filename={t("docs.api.config.tsconfig.filename_tsconfig")}
    />
  </>
);

const keySettingsRows = [
  [
    <Trans k="docs.api.config.tsconfig.row_jsx_name" components={[Code]} />,
    <Trans k="docs.api.config.tsconfig.row_jsx_value" components={[Code]} />,
    <Trans k="docs.api.config.tsconfig.row_jsx_why" />,
  ],
  [
    <Trans
      k="docs.api.config.tsconfig.row_jsx_import_source_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.config.tsconfig.row_jsx_import_source_value"
      components={[Code]}
    />,
    <Trans k="docs.api.config.tsconfig.row_jsx_import_source_why" />,
  ],
  [
    <Trans k="docs.api.config.tsconfig.row_target_name" components={[Code]} />,
    <Trans k="docs.api.config.tsconfig.row_target_value" components={[Code]} />,
    <Trans k="docs.api.config.tsconfig.row_target_why" />,
  ],
  [
    <Trans k="docs.api.config.tsconfig.row_module_name" components={[Code]} />,
    <Trans k="docs.api.config.tsconfig.row_module_value" components={[Code]} />,
    <Trans k="docs.api.config.tsconfig.row_module_why" />,
  ],
  [
    <Trans
      k="docs.api.config.tsconfig.row_module_resolution_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.config.tsconfig.row_module_resolution_value"
      components={[Code]}
    />,
    <Trans k="docs.api.config.tsconfig.row_module_resolution_why" />,
  ],
];

const KeySettingsSection: Component = () => (
  <>
    <DocHeading level={2} id="key-settings">
      {t("docs.api.config.tsconfig.heading_key_settings")}
    </DocHeading>
    <DocTable
      headers={[
        t("docs.api.config.tsconfig.table_header_setting"),
        t("docs.api.config.tsconfig.table_header_value"),
        t("docs.api.config.tsconfig.table_header_why"),
      ]}
      rows={keySettingsRows}
    />
  </>
);

const TsxCallout: Component = () => (
  <Callout type="info">
    <p>
      <Trans k="docs.api.config.tsconfig.info_tsx" components={[Code, Code]} />
    </p>
  </Callout>
);

const Tsconfig: Component = () => {
  return (
    <>
      <Intro />
      <RecommendedSection />
      <KeySettingsSection />
      <TsxCallout />
    </>
  );
};

export default Tsconfig;
