import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import Strong from "@/shared/components/strong";
import TextLink from "@/shared/components/text-link";

const MemorySystem: Component = () => {
  return (
    <>
      <h1>{t("docs.architecture.memory_system.title")}</h1>
      <p class="docs-description">
        {t("docs.architecture.memory_system.description")}
      </p>

      <DocHeading level={2} id="overview">
        {t("docs.architecture.memory_system.heading_overview")}
      </DocHeading>
      <p>
        <Trans
          k="docs.architecture.memory_system.overview_body"
          components={[Code, Code, Code, Code]}
        />
      </p>

      <DocHeading level={2} id="interface">
        {t("docs.architecture.memory_system.heading_interface")}
      </DocHeading>
      <ApiSignature
        name={t("docs.architecture.memory_system.signature_name")}
        signature={t("docs.architecture.memory_system.signature")}
      />

      <DocHeading level={3} id="required-methods">
        {t("docs.architecture.memory_system.heading_required_methods")}
      </DocHeading>
      <DocTable
        headers={[
          t("docs.architecture.memory_system.table_header_method"),
          t("docs.architecture.memory_system.table_header_description"),
        ]}
        rows={[
          [
            <Trans
              k="docs.architecture.memory_system.method_get_state_name"
              components={[Code]}
            />,
            <Trans
              k="docs.architecture.memory_system.method_get_state_desc"
              components={[Code]}
            />,
          ],
          [
            <Trans
              k="docs.architecture.memory_system.method_save_state_name"
              components={[Code]}
            />,
            <Trans k="docs.architecture.memory_system.method_save_state_desc" />,
          ],
        ]}
      />

      <DocHeading level={3} id="optional-methods">
        {t("docs.architecture.memory_system.heading_optional_methods")}
      </DocHeading>
      <DocTable
        headers={[
          t("docs.architecture.memory_system.table_header_method"),
          t("docs.architecture.memory_system.table_header_description"),
        ]}
        rows={[
          [
            <Trans
              k="docs.architecture.memory_system.method_acquire_lock_name"
              components={[Code]}
            />,
            <Trans
              k="docs.architecture.memory_system.method_acquire_lock_desc"
              components={[Code]}
            />,
          ],
          [
            <Trans
              k="docs.architecture.memory_system.method_release_lock_name"
              components={[Code]}
            />,
            <Trans k="docs.architecture.memory_system.method_release_lock_desc" />,
          ],
          [
            <Trans
              k="docs.architecture.memory_system.method_append_audit_log_name"
              components={[Code]}
            />,
            <Trans k="docs.architecture.memory_system.method_append_audit_log_desc" />,
          ],
          [
            <Trans
              k="docs.architecture.memory_system.method_get_audit_log_name"
              components={[Code]}
            />,
            <Trans k="docs.architecture.memory_system.method_get_audit_log_desc" />,
          ],
        ]}
      />

      <DocHeading level={2} id="deployment-state">
        {t("docs.architecture.memory_system.heading_deployment_state")}
      </DocHeading>
      <p>{t("docs.architecture.memory_system.deployment_state_body")}</p>
      <DocCodeBlock
        code={t("docs.architecture.memory_system.code_deployment_state")}
        filename={t("docs.architecture.memory_system.code_filename_types")}
      />

      <DocHeading level={3} id="serialized-node">
        {t("docs.architecture.memory_system.heading_serialized_node")}
      </DocHeading>
      <DocCodeBlock
        code={t("docs.architecture.memory_system.code_serialized_node")}
        filename={t("docs.architecture.memory_system.code_filename_types")}
      />

      <DocHeading level={3} id="audit-log-entry">
        {t("docs.architecture.memory_system.heading_audit_log_entry")}
      </DocHeading>
      <DocCodeBlock
        code={t("docs.architecture.memory_system.code_audit_log_entry")}
        filename={t("docs.architecture.memory_system.code_filename_types")}
      />

      <DocHeading level={2} id="lifecycle">
        {t("docs.architecture.memory_system.heading_lifecycle")}
      </DocHeading>
      <ol>
        <li>
          <Trans
            k="docs.architecture.memory_system.lifecycle_step_render"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.memory_system.lifecycle_step_get_state"
            components={[Code]}
          />
        </li>
        <li>
          <Trans k="docs.architecture.memory_system.lifecycle_step_hydrate_outputs" />
        </li>
        <li>
          <Trans
            k="docs.architecture.memory_system.lifecycle_step_hydrate_stores"
            components={[Code, Code]}
          />
        </li>
        <li>
          <Trans k="docs.architecture.memory_system.lifecycle_step_diff" />
        </li>
        <li>
          <Trans k="docs.architecture.memory_system.lifecycle_step_rerun" />
        </li>
        <li>
          <Trans
            k="docs.architecture.memory_system.lifecycle_step_save_state"
            components={[Code]}
          />
        </li>
      </ol>

      <DocHeading level={2} id="crash-recovery">
        {t("docs.architecture.memory_system.heading_crash_recovery")}
      </DocHeading>
      <p>
        <Trans
          k="docs.architecture.memory_system.crash_recovery_body"
          components={[Code]}
        />
      </p>

      <DocHeading level={2} id="what-memory-enables">
        {t("docs.architecture.memory_system.heading_what_memory_enables")}
      </DocHeading>
      <ul>
        <li>
          <Trans
            k="docs.architecture.memory_system.enables_crash_recovery"
            components={[Strong]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.memory_system.enables_incremental_deploys"
            components={[Strong]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.memory_system.enables_store_hydration"
            components={[Strong, Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.memory_system.enables_drift_detection"
            components={[Strong]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.memory_system.enables_concurrency_protection"
            components={[Strong]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.memory_system.enables_audit_trail"
            components={[Strong]}
          />
        </li>
      </ul>

      <DocHeading level={2} id="backend-options">
        {t("docs.architecture.memory_system.heading_backend_options")}
      </DocHeading>
      <p>{t("docs.architecture.memory_system.backend_options_intro")}</p>
      <DocTable
        headers={[
          t("docs.architecture.memory_system.table_header_backend"),
          t("docs.architecture.memory_system.table_header_best_for"),
        ]}
        rows={[
          [
            <Trans
              k="docs.architecture.memory_system.backend_files_name"
              components={[Strong]}
            />,
            <Trans k="docs.architecture.memory_system.backend_files_desc" />,
          ],
          [
            <Trans
              k="docs.architecture.memory_system.backend_dynamodb_name"
              components={[Strong]}
            />,
            <Trans k="docs.architecture.memory_system.backend_dynamodb_desc" />,
          ],
          [
            <Trans
              k="docs.architecture.memory_system.backend_s3_name"
              components={[Strong]}
            />,
            <Trans k="docs.architecture.memory_system.backend_s3_desc" />,
          ],
          [
            <Trans
              k="docs.architecture.memory_system.backend_postgres_name"
              components={[Strong]}
            />,
            <Trans k="docs.architecture.memory_system.backend_postgres_desc" />,
          ],
          [
            <Trans
              k="docs.architecture.memory_system.backend_redis_name"
              components={[Strong]}
            />,
            <Trans k="docs.architecture.memory_system.backend_redis_desc" />,
          ],
        ]}
      />

      <Callout type="tip">
        <p>
          <Trans
            k="docs.architecture.memory_system.tip_minimal_example"
            components={[
              (props) => (
                <TextLink href="#/docs/getting-started/state-and-memory">
                  {props.children}
                </TextLink>
              ),
            ]}
          />
        </p>
      </Callout>
    </>
  );
};

export default MemorySystem;
