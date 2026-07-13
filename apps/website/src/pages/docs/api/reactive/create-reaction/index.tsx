import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
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
            <Trans k="docs.api.reactive.create_reaction.param_on_invalidate_name" />,
            <Trans k="docs.api.reactive.create_reaction.param_on_invalidate_type" />,
            <Trans k="docs.api.reactive.create_reaction.param_on_invalidate_desc" />,
          ],
          [
            <Trans k="docs.api.reactive.create_reaction.param_options_name" />,
            <Trans k="docs.api.reactive.create_reaction.param_options_type" />,
            <Trans k="docs.api.reactive.create_reaction.param_options_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans k="docs.api.reactive.create_reaction.returns_body" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default CreateReaction;
