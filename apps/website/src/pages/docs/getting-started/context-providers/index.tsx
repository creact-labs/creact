import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const provider = "site-publisher/src/aws/provider/index.tsx";

function Intro() {
  return (
    <>
      <h1>{t("docs.getting_started.context_providers.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.context_providers.description")}
      </p>
    </>
  );
}

function CreatingContext() {
  return (
    <>
      <DocHeading level={2} id="creating-context">
        {t("docs.getting_started.context_providers.heading_creating_context")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.context_providers.creating_context_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(provider, "context")}
        filename={t("docs.getting_started.context_providers.filename_provider")}
      />
    </>
  );
}

function ProvidingValues() {
  return (
    <>
      <DocHeading level={2} id="providing-values">
        {t("docs.getting_started.context_providers.heading_providing_values")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.context_providers.providing_values_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(provider, "provider")}
        filename={t("docs.getting_started.context_providers.filename_provider")}
      />
    </>
  );
}

function ConsumingContext() {
  return (
    <>
      <DocHeading level={2} id="consuming-context">
        {t("docs.getting_started.context_providers.heading_consuming")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.context_providers.consuming_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(provider, "use-aws")}
        filename={t("docs.getting_started.context_providers.filename_provider")}
      />

      <Callout type="tip">
        <p>{t("docs.getting_started.context_providers.tip_cross_cutting")}</p>
      </Callout>
    </>
  );
}

const ContextProviders: Component = () => (
  <>
    <Intro />
    <CreatingContext />
    <ProvidingValues />
    <ConsumingContext />
  </>
);

export default ContextProviders;
