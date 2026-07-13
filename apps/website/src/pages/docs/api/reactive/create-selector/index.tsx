import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
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
            <Trans k="docs.api.reactive.create_selector.param_source_name" />,
            <Trans k="docs.api.reactive.create_selector.param_source_type" />,
            <Trans k="docs.api.reactive.create_selector.param_source_desc" />,
          ],
          [
            <Trans k="docs.api.reactive.create_selector.param_fn_name" />,
            <Trans k="docs.api.reactive.create_selector.param_fn_type" />,
            <Trans k="docs.api.reactive.create_selector.param_fn_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans k="docs.api.reactive.create_selector.returns_body" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default CreateSelector;
