import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/owner/run-with-owner.ts";

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
            <Trans k="docs.api.owner.run_with_owner.param_owner_name" />,
            <Trans k="docs.api.owner.run_with_owner.param_owner_type" />,
            <Trans k="docs.api.owner.run_with_owner.param_owner_desc" />,
          ],
          [
            <Trans k="docs.api.owner.run_with_owner.param_fn_name" />,
            <Trans k="docs.api.owner.run_with_owner.param_fn_type" />,
            <Trans k="docs.api.owner.run_with_owner.param_fn_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />

      <Callout type="info">
        <p>
          <Trans k="docs.api.owner.run_with_owner.info_async_owner" />
        </p>
      </Callout>
    </>
  );
};

export default RunWithOwner;
