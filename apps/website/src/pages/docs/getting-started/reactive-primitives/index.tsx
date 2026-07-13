import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import RichText from "@/shared/components/rich-text";

const samples = "getting-started-tour/src/reactive-primitives.ts";

const ReactivePrimitives: Component = () => {
  return (
    <>
      <h1>{t("docs.getting_started.reactive_primitives.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.reactive_primitives.description")}
      </p>

      <DocHeading level={2} id="signals">
        {t("docs.getting_started.reactive_primitives.heading_signals")}
      </DocHeading>
      <p>{t("docs.getting_started.reactive_primitives.signals_intro")}</p>
      <DocCodeBlock code={codeSample(samples, "signals")} />

      <DocHeading level={2} id="effects">
        {t("docs.getting_started.reactive_primitives.heading_effects")}
      </DocHeading>
      <p>{t("docs.getting_started.reactive_primitives.effects_intro")}</p>
      <DocCodeBlock code={codeSample(samples, "effects")} />

      <Callout type="info">
        <p>
          {t("docs.getting_started.reactive_primitives.info_batched_effects")}
        </p>
      </Callout>

      <DocHeading level={2} id="memos">
        {t("docs.getting_started.reactive_primitives.heading_memos")}
      </DocHeading>
      <p>{t("docs.getting_started.reactive_primitives.memos_intro")}</p>
      <DocCodeBlock code={codeSample(samples, "memos")} />

      <DocHeading level={2} id="batching">
        {t("docs.getting_started.reactive_primitives.heading_batching")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.reactive_primitives.batching_intro" />
      </p>
      <DocCodeBlock code={codeSample(samples, "batching")} />

      <DocHeading level={2} id="untrack">
        {t("docs.getting_started.reactive_primitives.heading_untrack")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.reactive_primitives.untrack_intro" />
      </p>
      <DocCodeBlock code={codeSample(samples, "untrack")} />
    </>
  );
};

export default ReactivePrimitives;
