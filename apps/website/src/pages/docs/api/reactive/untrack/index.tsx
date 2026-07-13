import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-tour/src/reactive/untrack.ts";

const Untrack: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.untrack.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.untrack.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.reactive.untrack.title")}
        signature={t("docs.api.reactive.untrack.signature")}
        parameters={[
          [
            <RichText k="docs.api.reactive.untrack.param_fn_name" />,
            <RichText k="docs.api.reactive.untrack.param_fn_type" />,
            <RichText k="docs.api.reactive.untrack.param_fn_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default Untrack;
