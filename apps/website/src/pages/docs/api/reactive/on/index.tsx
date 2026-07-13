import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import RichText from "@/shared/components/rich-text";

const samples = "api-cookbook/src/reactive/on.ts";

const On: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.on.title")}</h1>
      <p class="docs-description">{t("docs.api.reactive.on.description")}</p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.reactive.on.title")}
        signature={t("docs.api.reactive.on.signature")}
        parameters={[
          [
            <RichText k="docs.api.reactive.on.param_deps_name" />,
            <RichText k="docs.api.reactive.on.param_deps_type" />,
            <RichText k="docs.api.reactive.on.param_deps_desc" />,
          ],
          [
            <RichText k="docs.api.reactive.on.param_fn_name" />,
            <RichText k="docs.api.reactive.on.param_fn_type" />,
            <RichText k="docs.api.reactive.on.param_fn_desc" />,
          ],
          [
            <RichText k="docs.api.reactive.on.param_defer_name" />,
            <RichText k="docs.api.reactive.on.param_defer_type" />,
            <RichText k="docs.api.reactive.on.param_defer_desc" />,
          ],
        ]}
      />

      <DocHeading level={2} id="usage">
        {t("docs.api.reactive.on.heading_usage")}
      </DocHeading>

      <DocHeading level={3} id="single-dep">
        {t("docs.api.reactive.on.heading_single_dep")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "single-dep")} />

      <DocHeading level={3} id="multiple-deps">
        {t("docs.api.reactive.on.heading_multiple_deps")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "multiple-deps")} />

      <DocHeading level={3} id="deferred">
        {t("docs.api.reactive.on.heading_deferred")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "deferred")} />
    </>
  );
};

export default On;
