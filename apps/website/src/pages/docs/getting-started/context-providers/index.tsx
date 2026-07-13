import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import RichText from "@/shared/components/rich-text";

const samples = "getting-started-tour/src/context-providers.tsx";

const ContextProviders: Component = () => {
  return (
    <>
      <h1>{t("docs.getting_started.context_providers.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.context_providers.description")}
      </p>

      <DocHeading level={2} id="creating-context">
        {t("docs.getting_started.context_providers.heading_creating_context")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.context_providers.creating_context_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "create-context")}
        filename={t(
          "docs.getting_started.context_providers.filename_config_context",
        )}
      />

      <DocHeading level={2} id="providing-values">
        {t("docs.getting_started.context_providers.heading_providing_values")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.context_providers.providing_values_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "provide")}
        filename={t("docs.getting_started.context_providers.filename_app")}
      />

      <DocHeading level={2} id="nested-providers">
        {t("docs.getting_started.context_providers.heading_nested_providers")}
      </DocHeading>
      <p>
        {t("docs.getting_started.context_providers.nested_providers_intro")}
      </p>
      <DocCodeBlock code={codeSample(samples, "nested")} />

      <Callout type="tip">
        <p>{t("docs.getting_started.context_providers.tip_cross_cutting")}</p>
      </Callout>
    </>
  );
};

export default ContextProviders;
