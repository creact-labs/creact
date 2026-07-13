import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-tour/src/runtime/use-async-output.tsx";

const UseAsyncOutput: Component = () => {
  return (
    <>
      <h1>{t("docs.api.runtime.use_async_output.title")}</h1>
      <p class="docs-description">
        {t("docs.api.runtime.use_async_output.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.runtime.use_async_output.title")}
        signature={t("docs.api.runtime.use_async_output.signature")}
        parameters={[
          [
            <RichText k="docs.api.runtime.use_async_output.param_props_or_getter_name" />,
            <RichText k="docs.api.runtime.use_async_output.param_props_or_getter_type" />,
            <RichText k="docs.api.runtime.use_async_output.param_props_or_getter_desc" />,
          ],
          [
            <RichText k="docs.api.runtime.use_async_output.param_handler_name" />,
            <RichText k="docs.api.runtime.use_async_output.param_handler_type" />,
            <RichText k="docs.api.runtime.use_async_output.param_handler_desc" />,
          ],
        ]}
        returns={
          <p>
            <RichText k="docs.api.runtime.use_async_output.returns_desc" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />

      <Callout type="info">
        <p>
          <RichText k="docs.api.runtime.use_async_output.callout_idempotent" />
        </p>
      </Callout>
    </>
  );
};

export default UseAsyncOutput;
