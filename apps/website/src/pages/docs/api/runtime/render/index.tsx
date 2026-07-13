import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
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
            <Trans
              k="docs.api.runtime.render.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.render.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.render.param_fn_desc" />,
          ],
          [
            <Trans
              k="docs.api.runtime.render.param_memory_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.render.param_memory_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.render.param_memory_desc" />,
          ],
          [
            <Trans
              k="docs.api.runtime.render.param_stack_name_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.render.param_stack_name_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.render.param_stack_name_desc" />,
          ],
          [
            <Trans
              k="docs.api.runtime.render.param_options_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.render.param_options_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.render.param_options_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.runtime.render.returns_desc"
              components={[Code, Code, Code]}
            />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default Render;
