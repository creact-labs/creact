import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocSteps from "@/shared/components/doc-steps";
import Strong from "@/shared/components/strong";

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
          <Trans
            k="docs.architecture.reconciliation.change_creates"
            components={[Strong]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.reconciliation.change_deletes"
            components={[Strong]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.reconciliation.change_updates"
            components={[Strong]}
          />
        </li>
      </ul>
      <p>
        <Trans
          k="docs.architecture.reconciliation.matching_body"
          components={[Code, Code]}
        />
      </p>

      <DocHeading level={2} id="deep-equal">
        {t("docs.architecture.reconciliation.heading_deep_equal")}
      </DocHeading>
      <p>
        <Trans
          k="docs.architecture.reconciliation.deep_equal_body"
          components={[Code]}
        />
      </p>
      <DocCodeBlock code={t("docs.architecture.reconciliation.code_deep_equal")} />

      <DocHeading level={2} id="parallel-deployment">
        {t("docs.architecture.reconciliation.heading_parallel_deployment")}
      </DocHeading>
      <p>
        <Trans
          k="docs.architecture.reconciliation.parallel_deployment_intro"
          components={[Code]}
        />
      </p>
      <ul>
        <li>
          <Trans
            k="docs.architecture.reconciliation.parallel_deployment_order"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.reconciliation.parallel_deployment_batches"
            components={[Code]}
          />
        </li>
      </ul>

      <DocHeading level={2} id="source">
        {t("docs.architecture.reconciliation.heading_source")}
      </DocHeading>
      <p>
        <Trans
          k="docs.architecture.reconciliation.source_intro"
          components={[Code]}
        />
      </p>
      <ul>
        <li>
          <Trans
            k="docs.architecture.reconciliation.source_reconcile"
            components={[Code, Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.reconciliation.source_deep_equal"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.reconciliation.source_build_dependency_graph"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.reconciliation.source_topological_sort"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.reconciliation.source_compute_parallel_batches"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.architecture.reconciliation.source_change_detectors"
            components={[Code, Code, Code, Code]}
          />
        </li>
      </ul>
    </>
  );
};

export default Reconciliation;
