import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const samples = "integrations/src/environment-variables.tsx";

const EnvironmentVariables: Component = () => {
  return (
    <>
      <h1>{t("docs.guides.environment_variables.title")}</h1>
      <p class="docs-description">
        {t("docs.guides.environment_variables.description")}
      </p>

      <DocHeading level={2} id="reading">
        {t("docs.guides.environment_variables.heading_reading")}
      </DocHeading>
      <p>
        <Trans k="docs.guides.environment_variables.reading_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "reading")}
        filename={t("docs.guides.environment_variables.filename_app")}
      />

      <DocHeading level={2} id="per-environment">
        {t("docs.guides.environment_variables.heading_per_environment")}
      </DocHeading>
      <DocCodeBlock
        code={codeSample(samples, "per-environment")}
        filename={t("docs.guides.environment_variables.filename_config")}
      />

      <DocHeading level={2} id="secrets">
        {t("docs.guides.environment_variables.heading_secrets")}
      </DocHeading>
      <p>{t("docs.guides.environment_variables.secrets_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.guides.environment_variables.code_env")}
        filename={t("docs.guides.environment_variables.filename_env")}
      />

      <Callout type="warning">
        <p>
          <Trans k="docs.guides.environment_variables.warning_dotenv" />
        </p>
      </Callout>
    </>
  );
};

export default EnvironmentVariables;
