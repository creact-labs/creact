import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";

const Intro: Component = () => (
  <>
    <h1>{t("docs.api.config.package_json.title")}</h1>
    <p class="docs-description">
      {t("docs.api.config.package_json.description")}
    </p>
  </>
);

const MinimalSection: Component = () => (
  <>
    <DocHeading level={2} id="minimal">
      {t("docs.api.config.package_json.heading_minimal")}
    </DocHeading>
    <DocCodeBlock
      lang="json"
      code={t("docs.api.config.package_json.code_minimal")}
      filename={t("docs.api.config.package_json.filename_package_json")}
    />
  </>
);

const KeyFieldsSection: Component = () => (
  <>
    <DocHeading level={2} id="key-fields">
      {t("docs.api.config.package_json.heading_key_fields")}
    </DocHeading>
    <DocTable
      headers={[
        t("docs.api.config.package_json.table_header_field"),
        t("docs.api.config.package_json.table_header_value"),
        t("docs.api.config.package_json.table_header_why"),
      ]}
      rows={[
        [
          <Trans
            k="docs.api.config.package_json.row_type_name"
            components={[Code]}
          />,
          <Trans
            k="docs.api.config.package_json.row_type_value"
            components={[Code]}
          />,
          <Trans k="docs.api.config.package_json.row_type_why" />,
        ],
        [
          <Trans
            k="docs.api.config.package_json.row_start_name"
            components={[Code]}
          />,
          <Trans
            k="docs.api.config.package_json.row_start_value"
            components={[Code]}
          />,
          <Trans k="docs.api.config.package_json.row_start_why" />,
        ],
        [
          <Trans
            k="docs.api.config.package_json.row_dev_name"
            components={[Code]}
          />,
          <Trans
            k="docs.api.config.package_json.row_dev_value"
            components={[Code]}
          />,
          <Trans k="docs.api.config.package_json.row_dev_why" />,
        ],
      ]}
    />
  </>
);

const WithTestingSection: Component = () => (
  <>
    <DocHeading level={2} id="with-testing">
      {t("docs.api.config.package_json.heading_with_testing")}
    </DocHeading>
    <DocCodeBlock
      lang="json"
      code={t("docs.api.config.package_json.code_with_testing")}
      filename={t("docs.api.config.package_json.filename_package_json")}
    />
  </>
);

const PackageJson: Component = () => {
  return (
    <>
      <Intro />
      <MinimalSection />
      <KeyFieldsSection />
      <WithTestingSection />
    </>
  );
};

export default PackageJson;
