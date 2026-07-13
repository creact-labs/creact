import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
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
            <Trans
              k="docs.api.lifecycle.on_cleanup.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.lifecycle.on_cleanup.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.lifecycle.on_cleanup.param_fn_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans k="docs.api.lifecycle.on_cleanup.returns_desc" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />

      <Callout type="warning">
        <p>
          <Trans
            k="docs.api.lifecycle.on_cleanup.warning_no_owner"
            components={[Code, Code, Code]}
          />
        </p>
      </Callout>
    </>
  );
};

export default OnCleanup;
