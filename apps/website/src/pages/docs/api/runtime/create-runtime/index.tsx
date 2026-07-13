import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocTable from "@/shared/components/doc-table";
import RichText from "@/shared/components/rich-text";
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
            <RichText k="docs.api.runtime.create_runtime.param_root_name" />,
            <RichText k="docs.api.runtime.create_runtime.param_root_type" />,
            <RichText k="docs.api.runtime.create_runtime.param_root_desc" />,
          ],
        ]}
        returns={
          <p>
            <RichText k="docs.api.runtime.create_runtime.returns_desc" />
          </p>
        }
      />

      <UsageSection
        code={codeSample(samples, "usage")}
        filename={t("docs.api.runtime.create_runtime.usage_filename")}
      >
        <p>
          <RichText k="docs.api.runtime.create_runtime.outputs_intro" />
        </p>
        <DocTable
          headers={[
            t("docs.api.runtime.create_runtime.outputs_table_output"),
            t("docs.api.runtime.create_runtime.outputs_table_type"),
            t("docs.api.runtime.create_runtime.outputs_table_meaning"),
          ]}
          rows={[
            [
              <RichText k="docs.api.runtime.create_runtime.output_status_name" />,
              <RichText k="docs.api.runtime.create_runtime.output_status_type" />,
              <RichText k="docs.api.runtime.create_runtime.output_status_desc" />,
            ],
            [
              <RichText k="docs.api.runtime.create_runtime.output_ready_name" />,
              <RichText k="docs.api.runtime.create_runtime.output_ready_type" />,
              <RichText k="docs.api.runtime.create_runtime.output_ready_desc" />,
            ],
            [
              <RichText k="docs.api.runtime.create_runtime.output_error_name" />,
              <RichText k="docs.api.runtime.create_runtime.output_error_type" />,
              <RichText k="docs.api.runtime.create_runtime.output_error_desc" />,
            ],
          ]}
        />
        <Callout type="info">
          <p>
            <RichText k="docs.api.runtime.create_runtime.callout_detach" />
          </p>
        </Callout>
      </UsageSection>
    </>
  );
};

export default CreateRuntime;
