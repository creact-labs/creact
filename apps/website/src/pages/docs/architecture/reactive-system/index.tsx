import type { Component } from "solid-js";
import { t } from "@/i18n";
import Callout from "@/shared/components/callout";
import DocHeading from "@/shared/components/doc-heading";
import DocSteps from "@/shared/components/doc-steps";
import DocTable from "@/shared/components/doc-table";
import RichText from "@/shared/components/rich-text";

const ReactiveSystem: Component = () => {
  return (
    <>
      <h1>{t("docs.architecture.reactive_system.title")}</h1>
      <p class="docs-description">
        {t("docs.architecture.reactive_system.description")}
      </p>

      <DocHeading level={2} id="core-concepts">
        {t("docs.architecture.reactive_system.heading_core_concepts")}
      </DocHeading>

      <DocHeading level={3} id="signals">
        {t("docs.architecture.reactive_system.heading_signals")}
      </DocHeading>
      <p>{t("docs.architecture.reactive_system.signals_body")}</p>

      <DocHeading level={3} id="computations">
        {t("docs.architecture.reactive_system.heading_computations")}
      </DocHeading>
      <p>{t("docs.architecture.reactive_system.computations_body")}</p>

      <DocHeading level={3} id="ownership">
        {t("docs.architecture.reactive_system.heading_ownership")}
      </DocHeading>
      <p>{t("docs.architecture.reactive_system.ownership_body")}</p>

      <DocHeading level={2} id="execution-model">
        {t("docs.architecture.reactive_system.heading_execution_model")}
      </DocHeading>
      <DocSteps
        steps={[
          {
            label: t("docs.architecture.reactive_system.step_signal_write_label"),
            body: <RichText k="docs.architecture.reactive_system.step_signal_write_body" />,
          },
          {
            label: t("docs.architecture.reactive_system.step_schedule_label"),
            body: <RichText k="docs.architecture.reactive_system.step_schedule_body" />,
          },
          {
            label: t("docs.architecture.reactive_system.step_batch_label"),
            body: <RichText k="docs.architecture.reactive_system.step_batch_body" />,
          },
          {
            label: t("docs.architecture.reactive_system.step_run_queue_label"),
            body: <RichText k="docs.architecture.reactive_system.step_run_queue_body" />,
          },
          {
            label: t("docs.architecture.reactive_system.step_clean_label"),
            body: <RichText k="docs.architecture.reactive_system.step_clean_body" />,
          },
          {
            label: t("docs.architecture.reactive_system.step_retrack_label"),
            body: <RichText k="docs.architecture.reactive_system.step_retrack_body" />,
          },
        ]}
      />

      <DocHeading level={2} id="source-modules">
        {t("docs.architecture.reactive_system.heading_source_modules")}
      </DocHeading>
      <DocTable
        headers={[
          t("docs.architecture.reactive_system.table_header_module"),
          t("docs.architecture.reactive_system.table_header_responsibility"),
        ]}
        rows={[
          [
            <RichText k="docs.architecture.reactive_system.module_tracking_name" />,
            <RichText k="docs.architecture.reactive_system.module_tracking_desc" />,
          ],
          [
            <RichText k="docs.architecture.reactive_system.module_signal_name" />,
            <RichText k="docs.architecture.reactive_system.module_signal_desc" />,
          ],
          [
            <RichText k="docs.architecture.reactive_system.module_effect_name" />,
            <RichText k="docs.architecture.reactive_system.module_effect_desc" />,
          ],
          [
            <RichText k="docs.architecture.reactive_system.module_owner_name" />,
            <RichText k="docs.architecture.reactive_system.module_owner_desc" />,
          ],
          [
            <RichText k="docs.architecture.reactive_system.module_selector_name" />,
            <RichText k="docs.architecture.reactive_system.module_selector_desc" />,
          ],
        ]}
      />

      <DocHeading level={2} id="glitch-free">
        {t("docs.architecture.reactive_system.heading_glitch_free")}
      </DocHeading>
      <p>{t("docs.architecture.reactive_system.glitch_free_body")}</p>

      <Callout type="info">
        <p>
          <RichText k="docs.architecture.reactive_system.callout_synchronous" />
        </p>
      </Callout>
    </>
  );
};

export default ReactiveSystem;
