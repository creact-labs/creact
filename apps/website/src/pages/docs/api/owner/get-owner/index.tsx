import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/owner/get-owner.ts";

const GetOwner: Component = () => {
  return (
    <>
      <h1>{t("docs.api.owner.get_owner.title")}</h1>
      <p class="docs-description">{t("docs.api.owner.get_owner.description")}</p>

      <ApiReference
        name={t("docs.api.owner.get_owner.title")}
        signature={t("docs.api.owner.get_owner.signature")}
        returns={
          <p>
            <Trans k="docs.api.owner.get_owner.returns_desc" />
          </p>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default GetOwner;
