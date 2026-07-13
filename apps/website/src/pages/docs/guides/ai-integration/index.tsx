import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const samples = "integrations/src/ai-integration.tsx";

const AiIntegration: Component = () => {
  return (
    <>
      <h1>{t("docs.guides.ai_integration.title")}</h1>
      <p class="docs-description">
        {t("docs.guides.ai_integration.description")}
      </p>

      <DocHeading level={2} id="provider">
        {t("docs.guides.ai_integration.heading_provider")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.ai_integration.provider_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "provider")}
        filename={t("docs.guides.ai_integration.filename_provider")}
      />

      <DocHeading level={2} id="generate-component">
        {t("docs.guides.ai_integration.heading_generate_component")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.ai_integration.generate_intro"
          components={[Code, Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "generate-component")}
        filename={t("docs.guides.ai_integration.filename_generate")}
      />

      <DocHeading level={2} id="reactive-pipeline">
        {t("docs.guides.ai_integration.heading_reactive_pipeline")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.ai_integration.pipeline_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "reactive-pipeline")}
        filename={t("docs.guides.ai_integration.filename_app")}
      />

      <Callout type="tip">
        <p>
          <Trans
            k="docs.guides.ai_integration.tip_persistence"
            components={[Code]}
          />
        </p>
      </Callout>
    </>
  );
};

export default AiIntegration;
