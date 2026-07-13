import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/reactive/batch.ts";

const Batch: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.batch.title")}</h1>
      <p class="docs-description">{t("docs.api.reactive.batch.description")}</p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.reactive.batch.title")}
        signature={t("docs.api.reactive.batch.signature")}
        parameters={[
          [
            <Trans k="docs.api.reactive.batch.param_fn_name" />,
            <Trans k="docs.api.reactive.batch.param_fn_type" />,
            <Trans k="docs.api.reactive.batch.param_fn_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans k="docs.api.reactive.batch.returns_body" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default Batch;
