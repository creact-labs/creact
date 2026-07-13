import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/lifecycle/on-mount.tsx";

const OnMount: Component = () => {
  return (
    <>
      <h1>{t("docs.api.lifecycle.on_mount.title")}</h1>
      <p class="docs-description">
        {t("docs.api.lifecycle.on_mount.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.lifecycle.on_mount.title")}
        signature={t("docs.api.lifecycle.on_mount.signature")}
        parameters={[
          [
            <RichText k="docs.api.lifecycle.on_mount.param_fn_name" />,
            <RichText k="docs.api.lifecycle.on_mount.param_fn_type" />,
            <RichText k="docs.api.lifecycle.on_mount.param_fn_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default OnMount;
