import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-tour/src/store/unwrap.ts";

const Unwrap: Component = () => {
  return (
    <>
      <h1>{t("docs.api.store.unwrap.title")}</h1>
      <p class="docs-description">{t("docs.api.store.unwrap.description")}</p>

      <ApiReference
        name={t("docs.api.store.unwrap.title")}
        signature={t("docs.api.store.unwrap.signature")}
        parameters={[
          [
            <RichText k="docs.api.store.unwrap.param_store_name" />,
            <RichText k="docs.api.store.unwrap.param_store_type" />,
            <RichText k="docs.api.store.unwrap.param_store_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default Unwrap;
