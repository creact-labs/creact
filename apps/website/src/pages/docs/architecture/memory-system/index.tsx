import type { Component } from "solid-js";
import { t } from "@/i18n";
import ApiSignature from "@/shared/components/api-signature";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import RichText from "@/shared/components/rich-text";

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
        <RichText k="docs.architecture.memory_system.overview_body" />
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
            <RichText k="docs.architecture.memory_system.method_get_state_name" />,
            <RichText k="docs.architecture.memory_system.method_get_state_desc" />,
          ],
          [
            <RichText k="docs.architecture.memory_system.method_save_state_name" />,
            <RichText k="docs.architecture.memory_system.method_save_state_desc" />,
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
            <RichText k="docs.architecture.memory_system.method_acquire_lock_name" />,
            <RichText k="docs.architecture.memory_system.method_acquire_lock_desc" />,
          ],
          [
            <RichText k="docs.architecture.memory_system.method_release_lock_name" />,
            <RichText k="docs.architecture.memory_system.method_release_lock_desc" />,
          ],
          [
            <RichText k="docs.architecture.memory_system.method_append_audit_log_name" />,
            <RichText k="docs.architecture.memory_system.method_append_audit_log_desc" />,
          ],
          [
            <RichText k="docs.architecture.memory_system.method_get_audit_log_name" />,
            <RichText k="docs.architecture.memory_system.method_get_audit_log_desc" />,
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
          <RichText k="docs.architecture.memory_system.lifecycle_step_render" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.lifecycle_step_get_state" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.lifecycle_step_hydrate_outputs" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.lifecycle_step_hydrate_stores" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.lifecycle_step_diff" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.lifecycle_step_rerun" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.lifecycle_step_save_state" />
        </li>
      </ol>

      <DocHeading level={2} id="crash-recovery">
        {t("docs.architecture.memory_system.heading_crash_recovery")}
      </DocHeading>
      <p>
        <RichText k="docs.architecture.memory_system.crash_recovery_body" />
      </p>

      <DocHeading level={2} id="what-memory-enables">
        {t("docs.architecture.memory_system.heading_what_memory_enables")}
      </DocHeading>
      <ul>
        <li>
          <RichText k="docs.architecture.memory_system.enables_crash_recovery" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.enables_incremental_deploys" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.enables_store_hydration" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.enables_drift_detection" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.enables_concurrency_protection" />
        </li>
        <li>
          <RichText k="docs.architecture.memory_system.enables_audit_trail" />
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
            <RichText k="docs.architecture.memory_system.backend_files_name" />,
            <RichText k="docs.architecture.memory_system.backend_files_desc" />,
          ],
          [
            <RichText k="docs.architecture.memory_system.backend_dynamodb_name" />,
            <RichText k="docs.architecture.memory_system.backend_dynamodb_desc" />,
          ],
          [
            <RichText k="docs.architecture.memory_system.backend_s3_name" />,
            <RichText k="docs.architecture.memory_system.backend_s3_desc" />,
          ],
          [
            <RichText k="docs.architecture.memory_system.backend_postgres_name" />,
            <RichText k="docs.architecture.memory_system.backend_postgres_desc" />,
          ],
          [
            <RichText k="docs.architecture.memory_system.backend_redis_name" />,
            <RichText k="docs.architecture.memory_system.backend_redis_desc" />,
          ],
        ]}
      />

      <Callout type="tip">
        <p>
          <RichText k="docs.architecture.memory_system.tip_minimal_example" />
        </p>
      </Callout>
    </>
  );
};

export default MemorySystem;
