import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocTable from "@/shared/components/doc-table";
import Em from "@/shared/components/em";
import TextLink from "@/shared/components/text-link";
import UsageSection from "@/shared/components/usage-section";

const tenantApp = "tenant-fleet/src/components/tenant-app/index.tsx";
const fleet = "tenant-fleet/src/app.tsx";

const CreateRuntime: Component = () => {
  return (
    <>
      <h1>{t("docs.api.runtime.create_runtime.title")}</h1>
      <p class="docs-description">
        {t("docs.api.runtime.create_runtime.description")}
      </p>

      <DocCodeBlock
        code={codeSample(tenantApp, "runtime-wrap")}
        filename={t("docs.api.runtime.create_runtime.hero_filename")}
      />

      <ApiReference
        name={t("docs.api.runtime.create_runtime.title")}
        signature={t("docs.api.runtime.create_runtime.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.runtime.create_runtime.param_root_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.create_runtime.param_root_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.create_runtime.param_root_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.runtime.create_runtime.returns_desc"
              components={[Code, Code, Code]}
            />
          </p>
        }
      />

      <UsageSection
        code={codeSample(fleet, "fleet")}
        filename={t("docs.api.runtime.create_runtime.usage_filename")}
      >
        <p>
          <Trans
            k="docs.api.runtime.create_runtime.usage_fleet"
            components={[Code, Code, Code]}
          />
        </p>
        <p>
          <Trans
            k="docs.api.runtime.create_runtime.outputs_intro"
            components={[Code, Code, Code, Code, Code]}
          />
        </p>
        <DocTable
          headers={[
            t("docs.api.runtime.create_runtime.outputs_table_output"),
            t("docs.api.runtime.create_runtime.outputs_table_type"),
            t("docs.api.runtime.create_runtime.outputs_table_meaning"),
          ]}
          rows={[
            [
              <Trans
                k="docs.api.runtime.create_runtime.output_status_name"
                components={[Code]}
              />,
              <Trans
                k="docs.api.runtime.create_runtime.output_status_type"
                components={[Code]}
              />,
              <Trans k="docs.api.runtime.create_runtime.output_status_desc" />,
            ],
            [
              <Trans
                k="docs.api.runtime.create_runtime.output_ready_name"
                components={[Code]}
              />,
              <Trans
                k="docs.api.runtime.create_runtime.output_ready_type"
                components={[Code]}
              />,
              <Trans k="docs.api.runtime.create_runtime.output_ready_desc" />,
            ],
            [
              <Trans
                k="docs.api.runtime.create_runtime.output_error_name"
                components={[Code]}
              />,
              <Trans
                k="docs.api.runtime.create_runtime.output_error_type"
                components={[Code]}
              />,
              <Trans k="docs.api.runtime.create_runtime.output_error_desc" />,
            ],
          ]}
        />
        <Callout type="info">
          <p>
            <Trans
              k="docs.api.runtime.create_runtime.callout_detach"
              components={[
                Em,
                (props) => (
                  <TextLink href="#/docs/examples/tenant-fleet">
                    {props.children}
                  </TextLink>
                ),
              ]}
            />
          </p>
        </Callout>
      </UsageSection>
    </>
  );
};

export default CreateRuntime;
