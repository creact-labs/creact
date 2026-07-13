import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";

const StateMachine: Component = () => {
  return (
    <>
      <h1>{t("docs.architecture.state_machine.title")}</h1>
      <p class="docs-description">
        {t("docs.architecture.state_machine.description")}
      </p>

      <DocHeading level={2} id="resource-states">
        {t("docs.architecture.state_machine.heading_resource_states")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.state_machine.resource_states_intro" />
      </p>
      <DocTable
        headers={[
          t("docs.architecture.state_machine.table_header_state"),
          t("docs.architecture.state_machine.table_header_description"),
        ]}
        rows={[
          [
            <Trans k="docs.architecture.state_machine.state_pending_name" />,
            <Trans k="docs.architecture.state_machine.state_pending_desc" />,
          ],
          [
            <Trans k="docs.architecture.state_machine.state_applying_name" />,
            <Trans k="docs.architecture.state_machine.state_applying_desc" />,
          ],
          [
            <Trans k="docs.architecture.state_machine.state_deployed_name" />,
            <Trans k="docs.architecture.state_machine.state_deployed_desc" />,
          ],
          [
            <Trans k="docs.architecture.state_machine.state_failed_name" />,
            <Trans k="docs.architecture.state_machine.state_failed_desc" />,
          ],
        ]}
      />

      <DocHeading level={2} id="deployment-status">
        {t("docs.architecture.state_machine.heading_deployment_status")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.state_machine.deployment_status_body" />
      </p>

      <DocHeading level={2} id="transitions">
        {t("docs.architecture.state_machine.heading_transitions")}
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={t("docs.architecture.state_machine.code_transitions")}
        filename={t("docs.architecture.state_machine.code_transitions_filename")}
      />

      <p>{t("docs.architecture.state_machine.removal_body")}</p>

      <DocHeading level={2} id="persistence">
        {t("docs.architecture.state_machine.heading_persistence")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.state_machine.persistence_body" />
      </p>

      <DocHeading level={2} id="crash-recovery">
        {t("docs.architecture.state_machine.heading_crash_recovery")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.state_machine.crash_recovery_body" />
      </p>

      <DocHeading level={2} id="audit-log">
        {t("docs.architecture.state_machine.heading_audit_log")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.state_machine.audit_log_body" />
      </p>

      <DocHeading level={2} id="source">
        {t("docs.architecture.state_machine.heading_source")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.state_machine.source_body" />
      </p>
    </>
  );
};

export default StateMachine;
