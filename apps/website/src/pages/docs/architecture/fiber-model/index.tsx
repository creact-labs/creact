import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocSteps from "@/shared/components/doc-steps";

const FiberModel: Component = () => {
  return (
    <>
      <h1>{t("docs.architecture.fiber_model.title")}</h1>
      <p class="docs-description">
        {t("docs.architecture.fiber_model.description")}
      </p>

      <DocHeading level={2} id="what-is-fiber">
        {t("docs.architecture.fiber_model.heading_what_is_fiber")}
      </DocHeading>
      <p>{t("docs.architecture.fiber_model.what_is_fiber_body")}</p>

      <DocHeading level={2} id="fiber-structure">
        {t("docs.architecture.fiber_model.heading_fiber_structure")}
      </DocHeading>
      <DocCodeBlock
        code={t("docs.architecture.fiber_model.code_fiber_structure")}
        filename={t("docs.architecture.fiber_model.code_fiber_structure_filename")}
      />

      <DocHeading level={2} id="lifecycle">
        {t("docs.architecture.fiber_model.heading_lifecycle")}
      </DocHeading>
      <DocSteps
        steps={[
          {
            label: t("docs.architecture.fiber_model.step_creation_label"),
            body: <Trans k="docs.architecture.fiber_model.step_creation_body" />,
          },
          {
            label: t("docs.architecture.fiber_model.step_reconciliation_label"),
            body: <Trans k="docs.architecture.fiber_model.step_reconciliation_body" />,
          },
          {
            label: t("docs.architecture.fiber_model.step_execution_label"),
            body: <Trans k="docs.architecture.fiber_model.step_execution_body" />,
          },
          {
            label: t("docs.architecture.fiber_model.step_serialization_label"),
            body: <Trans k="docs.architecture.fiber_model.step_serialization_body" />,
          },
          {
            label: t("docs.architecture.fiber_model.step_cleanup_label"),
            body: <Trans k="docs.architecture.fiber_model.step_cleanup_body" />,
          },
        ]}
      />

      <DocHeading level={2} id="paths">
        {t("docs.architecture.fiber_model.heading_paths")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.fiber_model.paths_body" />
      </p>
      <DocCodeBlock code={t("docs.architecture.fiber_model.code_paths")} />

      <DocHeading level={2} id="instance-nodes">
        {t("docs.architecture.fiber_model.heading_instance_nodes")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.fiber_model.instance_nodes_body" />
      </p>

      <DocHeading level={2} id="source">
        {t("docs.architecture.fiber_model.heading_source")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.fiber_model.source_body" />
      </p>
    </>
  );
};

export default FiberModel;
