import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import RichText from "@/shared/components/rich-text";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-tour/src/arrays/index-array.ts";

const IndexArray: Component = () => {
  return (
    <>
      <h1>{t("docs.api.arrays.index_array.title")}</h1>
      <p class="docs-description">
        {t("docs.api.arrays.index_array.description")}
      </p>

      <ApiReference
        name={t("docs.api.arrays.index_array.title")}
        signature={t("docs.api.arrays.index_array.signature")}
        parameters={[
          [
            <RichText k="docs.api.arrays.index_array.param_list_name" />,
            <RichText k="docs.api.arrays.index_array.param_list_type" />,
            <RichText k="docs.api.arrays.index_array.param_list_desc" />,
          ],
          [
            <RichText k="docs.api.arrays.index_array.param_map_fn_name" />,
            <RichText k="docs.api.arrays.index_array.param_map_fn_type" />,
            <RichText k="docs.api.arrays.index_array.param_map_fn_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default IndexArray;
