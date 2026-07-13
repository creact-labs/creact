import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import RichText from "@/shared/components/rich-text";

const samples = "api-tour/src/reactive/create-memo.ts";

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
            <RichText k="docs.api.reactive.create_memo.param_fn_name" />,
            <RichText k="docs.api.reactive.create_memo.param_fn_type" />,
            <RichText k="docs.api.reactive.create_memo.param_fn_desc" />,
          ],
          [
            <RichText k="docs.api.reactive.create_memo.param_value_name" />,
            <RichText k="docs.api.reactive.create_memo.param_value_type" />,
            <RichText k="docs.api.reactive.create_memo.param_value_desc" />,
          ],
          [
            <RichText k="docs.api.reactive.create_memo.param_options_name" />,
            <RichText k="docs.api.reactive.create_memo.param_options_type" />,
            <RichText k="docs.api.reactive.create_memo.param_options_desc" />,
          ],
        ]}
        returns={
          <p>
            <RichText k="docs.api.reactive.create_memo.returns_body" />
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
