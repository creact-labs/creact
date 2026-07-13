import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import Strong from "@/shared/components/strong";
import TextLink from "@/shared/components/text-link";

const samples = "durable-counter/src/state-and-memory.tsx";

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
        <Trans
          k="docs.getting_started.state_and_memory.why_persistence_body"
          components={[Code]}
        />
      </p>

      <DocHeading level={2} id="memory-interface">
        {t("docs.getting_started.state_and_memory.heading_memory_interface")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.state_and_memory.memory_interface_intro"
          components={[Code, Code, Code, Code]}
        />
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
        code={codeSample("durable-counter/src/memory.ts", "file-memory")}
        filename={t(
          "docs.getting_started.state_and_memory.filename_src_memory",
        )}
      />

      <DocHeading level={2} id="using-memory">
        {t("docs.getting_started.state_and_memory.heading_using_memory")}
      </DocHeading>
      <DocCodeBlock
        code={codeSample("durable-counter/index.tsx", "using-memory")}
        filename={t("docs.getting_started.state_and_memory.filename_index_tsx")}
      />

      <Callout type="tip">
        <p>
          <Trans
            k="docs.getting_started.state_and_memory.tip_stack_name"
            components={[Code]}
          />
        </p>
      </Callout>

      <DocHeading level={2} id="useAsyncOutput">
        {t("docs.getting_started.state_and_memory.heading_use_async_output")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.state_and_memory.use_async_output_intro"
          components={[Code, Code]}
        />
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
        <Trans
          k="docs.getting_started.state_and_memory.what_gets_persisted_body"
          components={[Code, Strong]}
        />
      </p>

      <DocHeading level={2} id="reconciliation">
        {t("docs.getting_started.state_and_memory.heading_reconciliation")}
      </DocHeading>
      <p>{t("docs.getting_started.state_and_memory.reconciliation_body")}</p>

      <Callout type="info">
        <p>
          <Trans
            k="docs.getting_started.state_and_memory.info_gitignore"
            components={[Code, Code]}
          />
        </p>
      </Callout>

      <p>
        <Trans
          k="docs.getting_started.state_and_memory.memory_system_link"
          components={[
            (props) => (
              <TextLink href="#/docs/architecture/memory-system">
                {props.children}
              </TextLink>
            ),
          ]}
        />
      </p>
    </>
  );
};

export default StateAndMemory;
