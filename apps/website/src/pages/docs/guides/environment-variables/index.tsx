import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const app = "site-publisher/src/app.tsx";
const pageWriter = "page-writer/index.tsx";

function IntroSection() {
  return (
    <>
      <h1>{t("docs.guides.environment_variables.title")}</h1>
      <p class="docs-description">
        {t("docs.guides.environment_variables.description")}
      </p>
    </>
  );
}

function ReadingSection() {
  return (
    <>
      <DocHeading level={2} id="reading">
        {t("docs.guides.environment_variables.heading_reading")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.environment_variables.reading_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "require-env")}
        filename={t("docs.guides.environment_variables.filename_app")}
      />
    </>
  );
}

function FailFastSection() {
  return (
    <>
      <DocHeading level={2} id="fail-fast">
        {t("docs.guides.environment_variables.heading_fail_fast")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.environment_variables.fail_fast_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(pageWriter, "entry-point")}
        filename={t("docs.guides.environment_variables.filename_entry")}
      />
    </>
  );
}

function SecretsSection() {
  return (
    <>
      <DocHeading level={2} id="secrets">
        {t("docs.guides.environment_variables.heading_secrets")}
      </DocHeading>
      <p>{t("docs.guides.environment_variables.secrets_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.guides.environment_variables.code_env")}
        filename={t("docs.guides.environment_variables.filename_env")}
      />
    </>
  );
}

function ClosingSection() {
  return (
    <>
      <Callout type="warning">
        <p>
          <Trans
            k="docs.guides.environment_variables.warning_dotenv"
            components={[Code, Code]}
          />
        </p>
      </Callout>
      <p>
        <Trans
          k="docs.guides.environment_variables.in_the_wild"
          components={[
            (props) => (
              <TextLink href="#/docs/examples/site-publisher">
                {props.children}
              </TextLink>
            ),
          ]}
        />
      </p>
    </>
  );
}

const EnvironmentVariables: Component = () => {
  return (
    <>
      <IntroSection />
      <ReadingSection />
      <FailFastSection />
      <SecretsSection />
      <ClosingSection />
    </>
  );
};

export default EnvironmentVariables;
