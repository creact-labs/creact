import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/runtime/render.tsx";

const Render: Component = () => {
  return (
    <>
      <h1>{t("docs.api.runtime.render.title")}</h1>
      <p class="docs-description">
        {t("docs.api.runtime.render.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.runtime.render.title")}
        signature={t("docs.api.runtime.render.signature")}
        parameters={[
          [
            <RichText k="docs.api.runtime.render.param_fn_name" />,
            <RichText k="docs.api.runtime.render.param_fn_type" />,
            <RichText k="docs.api.runtime.render.param_fn_desc" />,
          ],
          [
            <RichText k="docs.api.runtime.render.param_memory_name" />,
            <RichText k="docs.api.runtime.render.param_memory_type" />,
            <RichText k="docs.api.runtime.render.param_memory_desc" />,
          ],
          [
            <RichText k="docs.api.runtime.render.param_stack_name_name" />,
            <RichText k="docs.api.runtime.render.param_stack_name_type" />,
            <RichText k="docs.api.runtime.render.param_stack_name_desc" />,
          ],
          [
            <RichText k="docs.api.runtime.render.param_options_name" />,
            <RichText k="docs.api.runtime.render.param_options_type" />,
            <RichText k="docs.api.runtime.render.param_options_desc" />,
          ],
        ]}
        returns={
          <p>
            <RichText k="docs.api.runtime.render.returns_desc" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default Render;
