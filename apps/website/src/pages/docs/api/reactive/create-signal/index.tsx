import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import RichText from "@/shared/components/rich-text";

const samples = "api-tour/src/reactive/create-signal.ts";

const CreateSignal: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_signal.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_signal.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.reactive.create_signal.title")}
        signature={t("docs.api.reactive.create_signal.signature")}
        parameters={[
          [
            <RichText k="docs.api.reactive.create_signal.param_value_name" />,
            <RichText k="docs.api.reactive.create_signal.param_value_type" />,
            <RichText k="docs.api.reactive.create_signal.param_value_desc" />,
          ],
          [
            <RichText k="docs.api.reactive.create_signal.param_options_name" />,
            <RichText k="docs.api.reactive.create_signal.param_options_type" />,
            <RichText k="docs.api.reactive.create_signal.param_options_desc" />,
          ],
        ]}
        returns={
          <>
            <p>
              <RichText k="docs.api.reactive.create_signal.returns_intro" />
            </p>
            <ul>
              <li>
                <RichText k="docs.api.reactive.create_signal.returns_getter" />
              </li>
              <li>
                <RichText k="docs.api.reactive.create_signal.returns_setter" />
              </li>
            </ul>
          </>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.api.reactive.create_signal.heading_usage")}
      </DocHeading>

      <DocHeading level={3} id="basic">
        {t("docs.api.reactive.create_signal.heading_basic")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "basic")} />

      <DocHeading level={3} id="functional-updates">
        {t("docs.api.reactive.create_signal.heading_functional_updates")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "functional-updates")} />

      <DocHeading level={3} id="custom-equality">
        {t("docs.api.reactive.create_signal.heading_custom_equality")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "custom-equality")} />

      <Callout type="tip">
        <p>
          <RichText k="docs.api.reactive.create_signal.tip_equality" />
        </p>
      </Callout>
    </>
  );
};

export default CreateSignal;
