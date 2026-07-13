import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const samples = "api-cookbook/src/reactive/create-memo.ts";

const CreateMemo: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_memo.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_memo.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.reactive.create_memo.title")}
        signature={t("docs.api.reactive.create_memo.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.reactive.create_memo.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_memo.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_memo.param_fn_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_memo.param_value_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_memo.param_value_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_memo.param_value_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_memo.param_options_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_memo.param_options_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_memo.param_options_desc"
              components={[Code]}
            />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.reactive.create_memo.returns_body"
              components={[Code]}
            />
          </p>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.api.reactive.create_memo.heading_usage")}
      </DocHeading>

      <DocHeading level={3} id="derived-values">
        {t("docs.api.reactive.create_memo.heading_derived_values")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "derived-values")} />

      <DocHeading level={3} id="chaining">
        {t("docs.api.reactive.create_memo.heading_chaining")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "chaining")} />

      <DocHeading level={3} id="equality">
        {t("docs.api.reactive.create_memo.heading_equality")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "equality")} />
    </>
  );
};

export default CreateMemo;
