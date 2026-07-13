import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocSteps from "@/shared/components/doc-steps";

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
            body: <Trans k="docs.architecture.reconciliation.step_render_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_load_state_label"),
            body: <Trans k="docs.architecture.reconciliation.step_load_state_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_diff_label"),
            body: <Trans k="docs.architecture.reconciliation.step_diff_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_change_set_label"),
            body: <Trans k="docs.architecture.reconciliation.step_change_set_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_dependency_graph_label"),
            body: <Trans k="docs.architecture.reconciliation.step_dependency_graph_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_topological_sort_label"),
            body: <Trans k="docs.architecture.reconciliation.step_topological_sort_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_apply_label"),
            body: <Trans k="docs.architecture.reconciliation.step_apply_body" />,
          },
          {
            label: t("docs.architecture.reconciliation.step_save_state_label"),
            body: <Trans k="docs.architecture.reconciliation.step_save_state_body" />,
          },
        ]}
      />

      <DocHeading level={2} id="change-detection">
        {t("docs.architecture.reconciliation.heading_change_detection")}
      </DocHeading>
      <p>{t("docs.architecture.reconciliation.change_detection_intro")}</p>
      <ul>
        <li>
          <Trans k="docs.architecture.reconciliation.change_creates" />
        </li>
        <li>
          <Trans k="docs.architecture.reconciliation.change_deletes" />
        </li>
        <li>
          <Trans k="docs.architecture.reconciliation.change_updates" />
        </li>
      </ul>
      <p>
        <Trans k="docs.architecture.reconciliation.matching_body" />
      </p>

      <DocHeading level={2} id="deep-equal">
        {t("docs.architecture.reconciliation.heading_deep_equal")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.reconciliation.deep_equal_body" />
      </p>
      <DocCodeBlock code={t("docs.architecture.reconciliation.code_deep_equal")} />

      <DocHeading level={2} id="parallel-deployment">
        {t("docs.architecture.reconciliation.heading_parallel_deployment")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.reconciliation.parallel_deployment_intro" />
      </p>
      <ul>
        <li>
          <Trans k="docs.architecture.reconciliation.parallel_deployment_order" />
        </li>
        <li>
          <Trans k="docs.architecture.reconciliation.parallel_deployment_batches" />
        </li>
      </ul>

      <DocHeading level={2} id="source">
        {t("docs.architecture.reconciliation.heading_source")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.reconciliation.source_intro" />
      </p>
      <ul>
        <li>
          <Trans k="docs.architecture.reconciliation.source_reconcile" />
        </li>
        <li>
          <Trans k="docs.architecture.reconciliation.source_deep_equal" />
        </li>
        <li>
          <Trans k="docs.architecture.reconciliation.source_build_dependency_graph" />
        </li>
        <li>
          <Trans k="docs.architecture.reconciliation.source_topological_sort" />
        </li>
        <li>
          <Trans k="docs.architecture.reconciliation.source_compute_parallel_batches" />
        </li>
        <li>
          <Trans k="docs.architecture.reconciliation.source_change_detectors" />
        </li>
      </ul>
    </>
  );
};

export default Reconciliation;
