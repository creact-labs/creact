import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/reactive/create-reaction.ts";

const CreateReaction: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_reaction.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_reaction.description")}
      </p>

      <ApiReference
        name={t("docs.api.reactive.create_reaction.title")}
        signature={t("docs.api.reactive.create_reaction.signature")}
        parameters={[
          [
            <RichText k="docs.api.reactive.create_reaction.param_on_invalidate_name" />,
            <RichText k="docs.api.reactive.create_reaction.param_on_invalidate_type" />,
            <RichText k="docs.api.reactive.create_reaction.param_on_invalidate_desc" />,
          ],
          [
            <RichText k="docs.api.reactive.create_reaction.param_options_name" />,
            <RichText k="docs.api.reactive.create_reaction.param_options_type" />,
            <RichText k="docs.api.reactive.create_reaction.param_options_desc" />,
          ],
        ]}
        returns={
          <p>
            <RichText k="docs.api.reactive.create_reaction.returns_body" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default CreateReaction;
