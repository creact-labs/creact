import type { Component } from "solid-js";
import { t } from "@/i18n";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import RichText from "@/shared/components/rich-text";

const Deploying: Component = () => {
  return (
    <>
      <h1>{t("docs.getting_started.deploying.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.deploying.description")}
      </p>

      <DocHeading level={2} id="production-run">
        {t("docs.getting_started.deploying.heading_production_run")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.deploying.production_run_intro" />
      </p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.getting_started.deploying.code_run_start")}
        filename={t("docs.getting_started.deploying.filename_terminal")}
      />
      <p>{t("docs.getting_started.deploying.production_run_outro")}</p>

      <DocHeading level={2} id="ci-cd">
        {t("docs.getting_started.deploying.heading_ci_cd")}
      </DocHeading>
      <p>{t("docs.getting_started.deploying.ci_cd_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.getting_started.deploying.code_ci_cd")}
        filename={t("docs.getting_started.deploying.filename_workflow")}
      />

      <DocHeading level={2} id="state-storage">
        {t("docs.getting_started.deploying.heading_state_storage")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.deploying.state_storage_intro" />
      </p>
      <ul>
        <li>
          <RichText k="docs.getting_started.deploying.storage_s3" />
        </li>
        <li>
          <RichText k="docs.getting_started.deploying.storage_dynamodb" />
        </li>
        <li>
          <RichText k="docs.getting_started.deploying.storage_database" />
        </li>
      </ul>

      <DocHeading level={2} id="watch-mode">
        {t("docs.getting_started.deploying.heading_watch_mode")}
      </DocHeading>
      <p>{t("docs.getting_started.deploying.watch_mode_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.getting_started.deploying.code_watch")}
        filename={t("docs.getting_started.deploying.filename_terminal")}
      />
      <p>{t("docs.getting_started.deploying.watch_mode_outro")}</p>

      <Callout type="tip">
        <p>{t("docs.getting_started.deploying.tip_process_manager")}</p>
      </Callout>
    </>
  );
};

export default Deploying;
