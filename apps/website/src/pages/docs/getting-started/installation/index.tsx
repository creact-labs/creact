import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const Installation: Component = () => {
  return (
    <>
      <h1>{t("docs.getting_started.installation.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.installation.description")}
      </p>

      <DocHeading level={2} id="requirements">
        {t("docs.getting_started.installation.heading_requirements")}
      </DocHeading>
      <ul>
        <li>{t("docs.getting_started.installation.requirement_node")}</li>
        <li>
          {t("docs.getting_started.installation.requirement_package_manager")}
        </li>
      </ul>

      <DocHeading level={2} id="create-project">
        {t("docs.getting_started.installation.heading_create_project")}
      </DocHeading>
      <p>{t("docs.getting_started.installation.create_project_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.getting_started.installation.code_init_project")}
        filename={t("docs.getting_started.installation.filename_terminal")}
      />

      <p>{t("docs.getting_started.installation.install_creact_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.getting_started.installation.code_install_creact")}
        filename={t("docs.getting_started.installation.filename_terminal")}
      />

      <p>{t("docs.getting_started.installation.install_typescript_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.getting_started.installation.code_install_typescript")}
        filename={t("docs.getting_started.installation.filename_terminal")}
      />

      <DocHeading level={2} id="configure-typescript">
        {t("docs.getting_started.installation.heading_configure_typescript")}
      </DocHeading>
      <p>
        <Trans k="docs.getting_started.installation.configure_typescript_intro" />
      </p>
      <DocCodeBlock
        lang="json"
        code={t("docs.getting_started.installation.code_tsconfig")}
        filename={t("docs.getting_started.installation.filename_tsconfig")}
      />

      <Callout type="tip">
        <p>
          <Trans k="docs.getting_started.installation.tip_jsx_import_source" />
        </p>
      </Callout>

      <DocHeading level={2} id="add-scripts">
        {t("docs.getting_started.installation.heading_add_scripts")}
      </DocHeading>
      <p>
        <Trans k="docs.getting_started.installation.add_scripts_intro" />
      </p>
      <DocCodeBlock
        lang="json"
        code={t("docs.getting_started.installation.code_package_scripts")}
        filename={t("docs.getting_started.installation.filename_package_json")}
      />

      <DocHeading level={2} id="create-entry">
        {t("docs.getting_started.installation.heading_create_entry")}
      </DocHeading>
      <p>
        <Trans k="docs.getting_started.installation.create_entry_intro" />
      </p>
      <DocCodeBlock
        code={codeSample("durable-counter/first-entry.tsx", "entry-point")}
        filename={t("docs.getting_started.installation.filename_index_tsx")}
      />

      <DocHeading level={2} id="run">
        {t("docs.getting_started.installation.heading_run")}
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={t("docs.getting_started.installation.code_run_dev")}
        filename={t("docs.getting_started.installation.filename_terminal")}
      />

      <p>
        <Trans k="docs.getting_started.installation.run_outro" />
      </p>

      <DocHeading level={2} id="project-files">
        {t("docs.getting_started.installation.heading_project_files")}
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={t("docs.getting_started.installation.code_project_structure")}
        filename={t("docs.getting_started.installation.filename_structure")}
      />

      <p>
        <Trans k="docs.getting_started.installation.project_files_outro" />
      </p>
    </>
  );
};

export default Installation;
