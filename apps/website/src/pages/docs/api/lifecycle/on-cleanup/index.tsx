import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/lifecycle/on-cleanup.ts";

const OnCleanup: Component = () => {
  return (
    <>
      <h1>{t("docs.api.lifecycle.on_cleanup.title")}</h1>
      <p class="docs-description">
        {t("docs.api.lifecycle.on_cleanup.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.lifecycle.on_cleanup.title")}
        signature={t("docs.api.lifecycle.on_cleanup.signature")}
        parameters={[
          [
            <RichText k="docs.api.lifecycle.on_cleanup.param_fn_name" />,
            <RichText k="docs.api.lifecycle.on_cleanup.param_fn_type" />,
            <RichText k="docs.api.lifecycle.on_cleanup.param_fn_desc" />,
          ],
        ]}
        returns={
          <p>
            <RichText k="docs.api.lifecycle.on_cleanup.returns_desc" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />

      <Callout type="warning">
        <p>
          <RichText k="docs.api.lifecycle.on_cleanup.warning_no_owner" />
        </p>
      </Callout>
    </>
  );
};

export default OnCleanup;
