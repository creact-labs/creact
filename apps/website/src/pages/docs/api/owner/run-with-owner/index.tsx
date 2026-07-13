import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-tour/src/owner/run-with-owner.ts";

const RunWithOwner: Component = () => {
  return (
    <>
      <h1>{t("docs.api.owner.run_with_owner.title")}</h1>
      <p class="docs-description">
        {t("docs.api.owner.run_with_owner.description")}
      </p>

      <ApiReference
        name={t("docs.api.owner.run_with_owner.title")}
        signature={t("docs.api.owner.run_with_owner.signature")}
        parameters={[
          [
            <RichText k="docs.api.owner.run_with_owner.param_owner_name" />,
            <RichText k="docs.api.owner.run_with_owner.param_owner_type" />,
            <RichText k="docs.api.owner.run_with_owner.param_owner_desc" />,
          ],
          [
            <RichText k="docs.api.owner.run_with_owner.param_fn_name" />,
            <RichText k="docs.api.owner.run_with_owner.param_fn_type" />,
            <RichText k="docs.api.owner.run_with_owner.param_fn_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />

      <Callout type="info">
        <p>
          <RichText k="docs.api.owner.run_with_owner.info_async_owner" />
        </p>
      </Callout>
    </>
  );
};

export default RunWithOwner;
