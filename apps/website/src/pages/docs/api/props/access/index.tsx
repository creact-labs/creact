import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/props/access.ts";

const Access: Component = () => {
  return (
    <>
      <h1>{t("docs.api.props.access.title")}</h1>
      <p class="docs-description">{t("docs.api.props.access.description")}</p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.props.access.title")}
        signature={t("docs.api.props.access.signature")}
        parameters={[
          [
            <Trans k="docs.api.props.access.param_value_name" />,
            <Trans k="docs.api.props.access.param_value_type" />,
            <Trans k="docs.api.props.access.param_value_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans k="docs.api.props.access.returns_desc" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default Access;
