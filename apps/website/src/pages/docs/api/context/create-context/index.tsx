import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/context/create-context.tsx";

const CreateContext: Component = () => {
  return (
    <>
      <h1>{t("docs.api.context.create_context.title")}</h1>
      <p class="docs-description">
        {t("docs.api.context.create_context.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.context.create_context.title")}
        signature={t("docs.api.context.create_context.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.context.create_context.param_default_value_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.context.create_context.param_default_value_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.context.create_context.param_default_value_desc"
              components={[Code]}
            />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.context.create_context.returns_desc"
              components={[Code, Code]}
            />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default CreateContext;
