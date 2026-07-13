import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import RichText from "@/shared/components/rich-text";

const samples = "api-cookbook/src/architecture/runtime-boundaries.tsx";

const RuntimeBoundaries: Component = () => {
  return (
    <>
      <h1>{t("docs.architecture.runtime_boundaries.title")}</h1>
      <p class="docs-description">
        <RichText k="docs.architecture.runtime_boundaries.description" />
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
            <RichText k="docs.architecture.runtime_boundaries.aspect_ledger_name" />,
            <RichText k="docs.architecture.runtime_boundaries.aspect_ledger_desc" />,
          ],
          [
            <RichText k="docs.architecture.runtime_boundaries.aspect_lock_name" />,
            <RichText k="docs.architecture.runtime_boundaries.aspect_lock_desc" />,
          ],
          [
            <RichText k="docs.architecture.runtime_boundaries.aspect_failure_name" />,
            <RichText k="docs.architecture.runtime_boundaries.aspect_failure_desc" />,
          ],
          [
            <RichText k="docs.architecture.runtime_boundaries.aspect_sealed_context_name" />,
            <RichText k="docs.architecture.runtime_boundaries.aspect_sealed_context_desc" />,
          ],
          [
            <RichText k="docs.architecture.runtime_boundaries.aspect_crosses_props_name" />,
            <RichText k="docs.architecture.runtime_boundaries.aspect_crosses_props_desc" />,
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
        <RichText k="docs.architecture.runtime_boundaries.recursion_body" />
      </p>
      <DocCodeBlock code={codeSample(samples, "recursion")} />

      <DocHeading level={2} id="detach-vs-destroy">
        {t("docs.architecture.runtime_boundaries.heading_detach_vs_destroy")}
      </DocHeading>
      <p>
        <RichText k="docs.architecture.runtime_boundaries.detach_vs_destroy_body" />
      </p>
      <DocCodeBlock code={codeSample(samples, "detach-vs-destroy")} />
      <Callout type="warning">
        <p>
          <RichText k="docs.architecture.runtime_boundaries.warning_teardown" />
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
