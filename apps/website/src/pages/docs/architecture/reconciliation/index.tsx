import type { Component } from "solid-js";
import { t } from "@/i18n";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocSteps from "@/shared/components/doc-steps";
import RichText from "@/shared/components/rich-text";

const Reconciliation: Component = () => {
  return (
    <>
      <h1>{t("docs.architecture.reconciliation.title")}</h1>
      <p class="docs-description">
        {t("docs.architecture.reconciliation.description")}
      </p>

      <DocHeading level={2} id="how-it-works">
        {t("docs.architecture.reconciliation.heading_how_it_works")}
      </DocHeading>
      <DocSteps
        steps={[
          {
            label: t("docs.architecture.reconciliation.step_render_label"),
            body: <RichText k="docs.architecture.reconciliation.step_render_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_load_state_label"),
            body: <RichText k="docs.architecture.reconciliation.step_load_state_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_diff_label"),
            body: <RichText k="docs.architecture.reconciliation.step_diff_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_change_set_label"),
            body: <RichText k="docs.architecture.reconciliation.step_change_set_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_dependency_graph_label"),
            body: <RichText k="docs.architecture.reconciliation.step_dependency_graph_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_topological_sort_label"),
            body: <RichText k="docs.architecture.reconciliation.step_topological_sort_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_apply_label"),
            body: <RichText k="docs.architecture.reconciliation.step_apply_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_save_state_label"),
            body: <RichText k="docs.architecture.reconciliation.step_save_state_body" />,
          },
        ]}
      />

      <DocHeading level={2} id="change-detection">
        {t("docs.architecture.reconciliation.heading_change_detection")}
      </DocHeading>
      <p>{t("docs.architecture.reconciliation.change_detection_intro")}</p>
      <ul>
        <li>
          <RichText k="docs.architecture.reconciliation.change_creates" />
        </li>
        <li>
          <RichText k="docs.architecture.reconciliation.change_deletes" />
        </li>
        <li>
          <RichText k="docs.architecture.reconciliation.change_updates" />
        </li>
      </ul>
      <p>
        <RichText k="docs.architecture.reconciliation.matching_body" />
      </p>

      <DocHeading level={2} id="deep-equal">
        {t("docs.architecture.reconciliation.heading_deep_equal")}
      </DocHeading>
      <p>
        <RichText k="docs.architecture.reconciliation.deep_equal_body" />
      </p>
      <DocCodeBlock code={t("docs.architecture.reconciliation.code_deep_equal")} />

      <DocHeading level={2} id="parallel-deployment">
        {t("docs.architecture.reconciliation.heading_parallel_deployment")}
      </DocHeading>
      <p>
        <RichText k="docs.architecture.reconciliation.parallel_deployment_intro" />
      </p>
      <ul>
        <li>
          <RichText k="docs.architecture.reconciliation.parallel_deployment_order" />
        </li>
        <li>
          <RichText k="docs.architecture.reconciliation.parallel_deployment_batches" />
        </li>
      </ul>

      <DocHeading level={2} id="source">
        {t("docs.architecture.reconciliation.heading_source")}
      </DocHeading>
      <p>
        <RichText k="docs.architecture.reconciliation.source_intro" />
      </p>
      <ul>
        <li>
          <RichText k="docs.architecture.reconciliation.source_reconcile" />
        </li>
        <li>
          <RichText k="docs.architecture.reconciliation.source_deep_equal" />
        </li>
        <li>
          <RichText k="docs.architecture.reconciliation.source_build_dependency_graph" />
        </li>
        <li>
          <RichText k="docs.architecture.reconciliation.source_topological_sort" />
        </li>
        <li>
          <RichText k="docs.architecture.reconciliation.source_compute_parallel_batches" />
        </li>
        <li>
          <RichText k="docs.architecture.reconciliation.source_change_detectors" />
        </li>
      </ul>
    </>
  );
};

export default Reconciliation;
