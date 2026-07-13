import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-tour/src/props/split-props.tsx";

const SplitProps: Component = () => {
  return (
    <>
      <h1>{t("docs.api.props.split_props.title")}</h1>
      <p class="docs-description">
        {t("docs.api.props.split_props.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.props.split_props.title")}
        signature={t("docs.api.props.split_props.signature")}
      />
      <p>{t("docs.api.props.split_props.behavior")}</p>

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default SplitProps;
