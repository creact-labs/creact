import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import DocCodeBlock from "@/shared/components/doc-code-block";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/store/create-store.ts";

const CreateStore: Component = () => {
  return (
    <>
      <h1>{t("docs.api.store.create_store.title")}</h1>
      <p class="docs-description">
        {t("docs.api.store.create_store.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.store.create_store.title")}
        signature={t("docs.api.store.create_store.signature")}
        parameters={[
          [
            <Trans k="docs.api.store.create_store.param_value_name" />,
            <Trans k="docs.api.store.create_store.param_value_type" />,
            <Trans k="docs.api.store.create_store.param_value_desc" />,
          ],
        ]}
        returns={
          <>
            <p>
              <Trans k="docs.api.store.create_store.returns_intro" />
            </p>
            <ul>
              <li>
                <Trans k="docs.api.store.create_store.returns_store" />
              </li>
              <li>
                <Trans k="docs.api.store.create_store.returns_setstore" />
              </li>
            </ul>
          </>
        }
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default CreateStore;
