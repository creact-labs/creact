import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-tour/src/reactive/create-render-effect.ts";

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
            <RichText k="docs.api.reactive.create_render_effect.param_fn_name" />,
            <RichText k="docs.api.reactive.create_render_effect.param_fn_type" />,
            <RichText k="docs.api.reactive.create_render_effect.param_fn_desc" />,
          ],
          [
            <RichText k="docs.api.reactive.create_render_effect.param_value_name" />,
            <RichText k="docs.api.reactive.create_render_effect.param_value_type" />,
            <RichText k="docs.api.reactive.create_render_effect.param_value_desc" />,
          ],
          [
            <RichText k="docs.api.reactive.create_render_effect.param_options_name" />,
            <RichText k="docs.api.reactive.create_render_effect.param_options_type" />,
            <RichText k="docs.api.reactive.create_render_effect.param_options_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />

      <Callout type="info">
        <p>
          <RichText k="docs.api.reactive.create_render_effect.info_ordering" />
        </p>
      </Callout>
    </>
  );
};

export default CreateRenderEffect;
