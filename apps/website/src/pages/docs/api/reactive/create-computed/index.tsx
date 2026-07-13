import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/reactive/create-computed.ts";

const CreateComputed: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_computed.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_computed.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.reactive.create_computed.title")}
        signature={t("docs.api.reactive.create_computed.signature")}
        parameters={[
          [
            <Trans k="docs.api.reactive.create_computed.param_fn_name" />,
            <Trans k="docs.api.reactive.create_computed.param_fn_type" />,
            <Trans k="docs.api.reactive.create_computed.param_fn_desc" />,
          ],
          [
            <Trans k="docs.api.reactive.create_computed.param_value_name" />,
            <Trans k="docs.api.reactive.create_computed.param_value_type" />,
            <Trans k="docs.api.reactive.create_computed.param_value_desc" />,
          ],
          [
            <Trans k="docs.api.reactive.create_computed.param_options_name" />,
            <Trans k="docs.api.reactive.create_computed.param_options_type" />,
            <Trans k="docs.api.reactive.create_computed.param_options_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />

      <Callout type="warning">
        <p>
          <Trans k="docs.api.reactive.create_computed.warning_prefer_memo" />
        </p>
      </Callout>
    </>
  );
};

export default CreateComputed;
