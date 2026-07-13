import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/reactive/create-render-effect.ts";

const CreateRenderEffect: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_render_effect.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_render_effect.description")}
      </p>

      <ApiReference
        name={t("docs.api.reactive.create_render_effect.title")}
        signature={t("docs.api.reactive.create_render_effect.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.reactive.create_render_effect.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_render_effect.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_render_effect.param_fn_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_render_effect.param_value_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_render_effect.param_value_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_render_effect.param_value_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_render_effect.param_options_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_render_effect.param_options_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_render_effect.param_options_desc"
              components={[Code]}
            />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />

      <Callout type="info">
        <p>
          <Trans
            k="docs.api.reactive.create_render_effect.info_ordering"
            components={[Code]}
          />
        </p>
      </Callout>
    </>
  );
};

export default CreateRenderEffect;
