import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/store/unwrap.ts";

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
            <Trans
              k="docs.api.store.unwrap.param_store_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.store.unwrap.param_store_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.store.unwrap.param_store_desc"
              components={[Code]}
            />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default Unwrap;
