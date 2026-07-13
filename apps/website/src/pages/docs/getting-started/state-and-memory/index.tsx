import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import RichText from "@/shared/components/rich-text";

const samples = "getting-started-tour/src/state-and-memory.tsx";

const StateAndMemory: Component = () => {
  return (
    <>
      <h1>{t("docs.getting_started.state_and_memory.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.state_and_memory.description")}
      </p>

      <DocHeading level={2} id="why-persistence">
        {t("docs.getting_started.state_and_memory.heading_why_persistence")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.state_and_memory.why_persistence_body" />
      </p>

      <DocHeading level={2} id="memory-interface">
        {t("docs.getting_started.state_and_memory.heading_memory_interface")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.state_and_memory.memory_interface_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "memory-interface")}
        filename={t("docs.getting_started.state_and_memory.filename_memory")}
      />

      <DocHeading level={2} id="file-memory">
        {t("docs.getting_started.state_and_memory.heading_file_memory")}
      </DocHeading>
      <p>{t("docs.getting_started.state_and_memory.file_memory_intro")}</p>
      <DocCodeBlock
        code={codeSample("getting-started-tour/src/memory.ts", "file-memory")}
        filename={t(
          "docs.getting_started.state_and_memory.filename_src_memory",
        )}
      />

      <DocHeading level={2} id="using-memory">
        {t("docs.getting_started.state_and_memory.heading_using_memory")}
      </DocHeading>
      <DocCodeBlock
        code={codeSample("getting-started-tour/index.tsx", "using-memory")}
        filename={t("docs.getting_started.state_and_memory.filename_index_tsx")}
      />

      <Callout type="tip">
        <p>
          <RichText k="docs.getting_started.state_and_memory.tip_stack_name" />
        </p>
      </Callout>

      <DocHeading level={2} id="useAsyncOutput">
        {t("docs.getting_started.state_and_memory.heading_use_async_output")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.state_and_memory.use_async_output_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "use-async-output")}
        filename={t("docs.getting_started.state_and_memory.filename_counter")}
      />

      <DocHeading level={2} id="what-gets-persisted">
        {t(
          "docs.getting_started.state_and_memory.heading_what_gets_persisted",
        )}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.state_and_memory.what_gets_persisted_body" />
      </p>

      <DocHeading level={2} id="reconciliation">
        {t("docs.getting_started.state_and_memory.heading_reconciliation")}
      </DocHeading>
      <p>{t("docs.getting_started.state_and_memory.reconciliation_body")}</p>

      <Callout type="info">
        <p>
          <RichText k="docs.getting_started.state_and_memory.info_gitignore" />
        </p>
      </Callout>

      <p>
        <RichText k="docs.getting_started.state_and_memory.memory_system_link" />
      </p>
    </>
  );
};

export default StateAndMemory;
