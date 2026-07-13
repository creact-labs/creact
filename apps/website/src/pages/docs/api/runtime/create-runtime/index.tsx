import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocTable from "@/shared/components/doc-table";
import UsageSection from "@/shared/components/usage-section";

const samples = "api-cookbook/src/runtime/create-runtime.tsx";

const CreateRuntime: Component = () => {
  return (
    <>
      <h1>{t("docs.api.runtime.create_runtime.title")}</h1>
      <p class="docs-description">
        {t("docs.api.runtime.create_runtime.description")}
      </p>

      <DocCodeBlock code={codeSample(samples, "hero")} />

      <ApiReference
        name={t("docs.api.runtime.create_runtime.title")}
        signature={t("docs.api.runtime.create_runtime.signature")}
        parameters={[
          [
            <Trans k="docs.api.runtime.create_runtime.param_root_name" />,
            <Trans k="docs.api.runtime.create_runtime.param_root_type" />,
            <Trans k="docs.api.runtime.create_runtime.param_root_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans k="docs.api.runtime.create_runtime.returns_desc" />
          </p>
        }
      />

      <UsageSection
        code={codeSample(samples, "usage")}
        filename={t("docs.api.runtime.create_runtime.usage_filename")}
      >
        <p>
          <Trans k="docs.api.runtime.create_runtime.outputs_intro" />
        </p>
        <DocTable
          headers={[
            t("docs.api.runtime.create_runtime.outputs_table_output"),
            t("docs.api.runtime.create_runtime.outputs_table_type"),
            t("docs.api.runtime.create_runtime.outputs_table_meaning"),
          ]}
          rows={[
            [
              <Trans k="docs.api.runtime.create_runtime.output_status_name" />,
              <Trans k="docs.api.runtime.create_runtime.output_status_type" />,
              <Trans k="docs.api.runtime.create_runtime.output_status_desc" />,
            ],
            [
              <Trans k="docs.api.runtime.create_runtime.output_ready_name" />,
              <Trans k="docs.api.runtime.create_runtime.output_ready_type" />,
              <Trans k="docs.api.runtime.create_runtime.output_ready_desc" />,
            ],
            [
              <Trans k="docs.api.runtime.create_runtime.output_error_name" />,
              <Trans k="docs.api.runtime.create_runtime.output_error_type" />,
              <Trans k="docs.api.runtime.create_runtime.output_error_desc" />,
            ],
          ]}
        />
        <Callout type="info">
          <p>
            <Trans k="docs.api.runtime.create_runtime.callout_detach" />
          </p>
        </Callout>
      </UsageSection>
    </>
  );
};

export default CreateRuntime;
