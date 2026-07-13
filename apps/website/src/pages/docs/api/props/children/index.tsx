import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/props/children.tsx";

const Children: Component = () => {
  return (
    <>
      <h1>{t("docs.api.props.children.title")}</h1>
      <p class="docs-description">{t("docs.api.props.children.description")}</p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.props.children.title")}
        signature={t("docs.api.props.children.signature")}
        parameters={[
          [
            <Trans k="docs.api.props.children.param_fn_name" />,
            <Trans k="docs.api.props.children.param_fn_type" />,
            <Trans k="docs.api.props.children.param_fn_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans k="docs.api.props.children.returns_desc" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default Children;
