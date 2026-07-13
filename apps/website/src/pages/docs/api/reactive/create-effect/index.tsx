import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

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
            <Trans
              k="docs.api.reactive.create_effect.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_effect.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_effect.param_fn_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_effect.param_value_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_effect.param_value_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_effect.param_value_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_effect.param_options_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_effect.param_options_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_effect.param_options_desc"
              components={[Code]}
            />,
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
          <Trans
            k="docs.api.reactive.create_effect.info_batching"
            components={[Code]}
          />
        </p>
      </Callout>
    </>
  );
};

export default CreateEffect;
