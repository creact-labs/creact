import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-tour/src/props/merge-props.tsx";

const MergeProps: Component = () => {
  return (
    <>
      <h1>{t("docs.api.props.merge_props.title")}</h1>
      <p class="docs-description">
        {t("docs.api.props.merge_props.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.props.merge_props.title")}
        signature={t("docs.api.props.merge_props.signature")}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default MergeProps;
