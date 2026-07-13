import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const CreactWatch: Component = () => {
  return (
    <>
      <h1>{t("docs.api.cli.creact_watch.title")}</h1>
      <p class="docs-description">
        {t("docs.api.cli.creact_watch.description")}
      </p>

      <DocHeading level={2} id="usage">
        {t("docs.api.cli.creact_watch.heading_usage")}
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={t("docs.api.cli.creact_watch.code_usage")}
        filename={t("docs.api.cli.creact_watch.filename_terminal")}
      />

      <DocHeading level={2} id="behavior">
        {t("docs.api.cli.creact_watch.heading_behavior")}
      </DocHeading>
      <ol>
        <li>
          <Trans k="docs.api.cli.creact_watch.behavior_run" />
        </li>
        <li>
          <Trans
            k="docs.api.cli.creact_watch.behavior_watch"
            components={[Code, Code, Code, Code]}
          />
        </li>
        <li>
          <Trans k="docs.api.cli.creact_watch.behavior_restart" />
        </li>
        <li>
          <Trans k="docs.api.cli.creact_watch.behavior_state" />
        </li>
        <li>
          <Trans
            k="docs.api.cli.creact_watch.behavior_stop"
            components={[Code]}
          />
        </li>
      </ol>

      <DocHeading level={2} id="output">
        {t("docs.api.cli.creact_watch.heading_output")}
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={t("docs.api.cli.creact_watch.code_output")}
        filename={t("docs.api.cli.creact_watch.filename_terminal")}
      />

      <Callout type="tip">
        <p>
          <Trans k="docs.api.cli.creact_watch.tip_state_persists" />
        </p>
      </Callout>
    </>
  );
};

export default CreactWatch;
