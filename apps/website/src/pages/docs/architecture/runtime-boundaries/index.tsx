import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";

const samples = "api-cookbook/src/architecture/runtime-boundaries.tsx";

const RuntimeBoundaries: Component = () => {
  return (
    <>
      <h1>{t("docs.architecture.runtime_boundaries.title")}</h1>
      <p class="docs-description">
        <Trans k="docs.architecture.runtime_boundaries.description" />
      </p>

      <DocHeading level={2} id="the-sovereignty-model">
        {t("docs.architecture.runtime_boundaries.heading_sovereignty_model")}
      </DocHeading>
      <p>{t("docs.architecture.runtime_boundaries.sovereignty_model_body")}</p>
      <DocTable
        headers={[
          t("docs.architecture.runtime_boundaries.table_header_aspect"),
          t("docs.architecture.runtime_boundaries.table_header_semantics"),
        ]}
        rows={[
          [
            <Trans k="docs.architecture.runtime_boundaries.aspect_ledger_name" />,
            <Trans k="docs.architecture.runtime_boundaries.aspect_ledger_desc" />,
          ],
          [
            <Trans k="docs.architecture.runtime_boundaries.aspect_lock_name" />,
            <Trans k="docs.architecture.runtime_boundaries.aspect_lock_desc" />,
          ],
          [
            <Trans k="docs.architecture.runtime_boundaries.aspect_failure_name" />,
            <Trans k="docs.architecture.runtime_boundaries.aspect_failure_desc" />,
          ],
          [
            <Trans k="docs.architecture.runtime_boundaries.aspect_sealed_context_name" />,
            <Trans k="docs.architecture.runtime_boundaries.aspect_sealed_context_desc" />,
          ],
          [
            <Trans k="docs.architecture.runtime_boundaries.aspect_crosses_props_name" />,
            <Trans k="docs.architecture.runtime_boundaries.aspect_crosses_props_desc" />,
          ],
        ]}
      />
      <DocCodeBlock
        code={codeSample(samples, "fleet")}
        filename={t("docs.architecture.runtime_boundaries.filename_fleet")}
      />
      <p>{t("docs.architecture.runtime_boundaries.reactivity_body")}</p>

      <DocHeading level={2} id="recursion">
        {t("docs.architecture.runtime_boundaries.heading_recursion")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.runtime_boundaries.recursion_body" />
      </p>
      <DocCodeBlock code={codeSample(samples, "recursion")} />

      <DocHeading level={2} id="detach-vs-destroy">
        {t("docs.architecture.runtime_boundaries.heading_detach_vs_destroy")}
      </DocHeading>
      <p>
        <Trans k="docs.architecture.runtime_boundaries.detach_vs_destroy_body" />
      </p>
      <DocCodeBlock code={codeSample(samples, "detach-vs-destroy")} />
      <Callout type="warning">
        <p>
          <Trans k="docs.architecture.runtime_boundaries.warning_teardown" />
        </p>
      </Callout>

      <DocHeading level={2} id="publishing-node">
        {t("docs.architecture.runtime_boundaries.heading_publishing_node")}
      </DocHeading>
      <p>{t("docs.architecture.runtime_boundaries.publishing_node_body")}</p>
      <DocCodeBlock
        code={codeSample(samples, "publishing-node")}
        filename={t("docs.architecture.runtime_boundaries.filename_publisher")}
      />

      <DocHeading level={2} id="cross-ledger-reference">
        {t("docs.architecture.runtime_boundaries.heading_cross_ledger")}
      </DocHeading>
      <p>{t("docs.architecture.runtime_boundaries.cross_ledger_body")}</p>
      <DocCodeBlock
        code={codeSample(samples, "cross-ledger")}
        filename={t("docs.architecture.runtime_boundaries.filename_cross_ledger")}
      />

      <DocHeading level={2} id="remote-transport">
        {t("docs.architecture.runtime_boundaries.heading_remote_transport")}
      </DocHeading>
      <p>{t("docs.architecture.runtime_boundaries.remote_transport_body")}</p>
      <DocCodeBlock
        code={codeSample(samples, "remote-transport")}
        filename={t("docs.architecture.runtime_boundaries.filename_http_memory")}
      />
    </>
  );
};

export default RuntimeBoundaries;
