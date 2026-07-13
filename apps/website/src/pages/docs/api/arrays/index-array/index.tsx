import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/arrays/index-array.ts";

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
            <Trans k="docs.api.arrays.index_array.param_list_name" />,
            <Trans k="docs.api.arrays.index_array.param_list_type" />,
            <Trans k="docs.api.arrays.index_array.param_list_desc" />,
          ],
          [
            <Trans k="docs.api.arrays.index_array.param_map_fn_name" />,
            <Trans k="docs.api.arrays.index_array.param_map_fn_type" />,
            <Trans k="docs.api.arrays.index_array.param_map_fn_desc" />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default IndexArray;
