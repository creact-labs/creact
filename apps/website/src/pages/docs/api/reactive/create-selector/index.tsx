import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/reactive/create-selector.ts";

const CreateSelector: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_selector.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_selector.description")}
      </p>

      <ApiReference
        name={t("docs.api.reactive.create_selector.title")}
        signature={t("docs.api.reactive.create_selector.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.reactive.create_selector.param_source_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_selector.param_source_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_selector.param_source_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_selector.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_selector.param_fn_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_selector.param_fn_desc"
              components={[Code]}
            />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.reactive.create_selector.returns_body"
              components={[Code, Code, Code]}
            />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default CreateSelector;
