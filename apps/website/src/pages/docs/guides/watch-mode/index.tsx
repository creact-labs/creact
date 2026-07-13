import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const WatchMode: Component = () => {
  return (
    <>
      <h1>{t("docs.guides.watch_mode.title")}</h1>
      <p class="docs-description">{t("docs.guides.watch_mode.description")}</p>

      <DocHeading level={2} id="usage">
        {t("docs.guides.watch_mode.heading_usage")}
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={t("docs.guides.watch_mode.code_usage")}
        filename={t("docs.guides.watch_mode.filename_terminal")}
      />
      <p>{t("docs.guides.watch_mode.usage_desc")}</p>

      <DocHeading level={2} id="how-it-works">
        {t("docs.guides.watch_mode.heading_how_it_works")}
      </DocHeading>
      <ol>
        <li>{t("docs.guides.watch_mode.step_start")}</li>
        <li>
          <Trans
            k="docs.guides.watch_mode.step_watchers"
            components={[Code, Code, Code, Code]}
          />
        </li>
        <li>{t("docs.guides.watch_mode.step_stop")}</li>
        <li>{t("docs.guides.watch_mode.step_restart")}</li>
        <li>{t("docs.guides.watch_mode.step_reconcile")}</li>
      </ol>

      <DocHeading level={2} id="development-workflow">
        {t("docs.guides.watch_mode.heading_development_workflow")}
      </DocHeading>
      <p>{t("docs.guides.watch_mode.workflow_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.guides.watch_mode.code_workflow")}
        filename={t("docs.guides.watch_mode.filename_terminal")}
      />

      <DocHeading level={2} id="type-checking">
        {t("docs.guides.watch_mode.heading_type_checking")}
      </DocHeading>
      <p>{t("docs.guides.watch_mode.type_checking_desc")}</p>

      <Callout type="tip">
        <p>{t("docs.guides.watch_mode.tip_type_check")}</p>
      </Callout>
    </>
  );
};

export default WatchMode;
