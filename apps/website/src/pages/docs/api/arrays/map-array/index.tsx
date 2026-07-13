import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/arrays/map-array.ts";

const MapArray: Component = () => {
  return (
    <>
      <h1>{t("docs.api.arrays.map_array.title")}</h1>
      <p class="docs-description">{t("docs.api.arrays.map_array.description")}</p>

      <ApiReference
        name={t("docs.api.arrays.map_array.title")}
        signature={t("docs.api.arrays.map_array.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.arrays.map_array.param_list_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.arrays.map_array.param_list_type"
              components={[Code]}
            />,
            <Trans k="docs.api.arrays.map_array.param_list_desc" />,
          ],
          [
            <Trans
              k="docs.api.arrays.map_array.param_map_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.arrays.map_array.param_map_fn_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.arrays.map_array.param_map_fn_desc"
              components={[Code, Code]}
            />,
          ],
          [
            <Trans
              k="docs.api.arrays.map_array.param_options_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.arrays.map_array.param_options_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.arrays.map_array.param_options_desc"
              components={[Code]}
            />,
          ],
        ]}
      />

      <UsageSection code={codeSample(samples, "usage")} />
    </>
  );
};

export default MapArray;
