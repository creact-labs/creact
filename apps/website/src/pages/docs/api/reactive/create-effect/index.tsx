import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import RichText from "@/shared/components/rich-text";

const samples = "api-cookbook/src/reactive/create-effect.ts";

const CreateEffect: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_effect.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_effect.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.reactive.create_effect.title")}
        signature={t("docs.api.reactive.create_effect.signature")}
        parameters={[
          [
            <RichText k="docs.api.reactive.create_effect.param_fn_name" />,
            <RichText k="docs.api.reactive.create_effect.param_fn_type" />,
            <RichText k="docs.api.reactive.create_effect.param_fn_desc" />,
          ],
          [
            <RichText k="docs.api.reactive.create_effect.param_value_name" />,
            <RichText k="docs.api.reactive.create_effect.param_value_type" />,
            <RichText k="docs.api.reactive.create_effect.param_value_desc" />,
          ],
          [
            <RichText k="docs.api.reactive.create_effect.param_options_name" />,
            <RichText k="docs.api.reactive.create_effect.param_options_type" />,
            <RichText k="docs.api.reactive.create_effect.param_options_desc" />,
          ],
        ]}
      />

      <DocHeading level={2} id="usage">
        {t("docs.api.reactive.create_effect.heading_usage")}
      </DocHeading>

      <DocHeading level={3} id="basic">
        {t("docs.api.reactive.create_effect.heading_tracking")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "tracking")} />

      <DocHeading level={3} id="with-previous">
        {t("docs.api.reactive.create_effect.heading_previous")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "with-previous")} />

      <DocHeading level={3} id="cleanup">
        {t("docs.api.reactive.create_effect.heading_cleanup")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "cleanup")} />

      <Callout type="info">
        <p>
          <RichText k="docs.api.reactive.create_effect.info_batching" />
        </p>
      </Callout>
    </>
  );
};

export default CreateEffect;
