import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import Strong from "@/shared/components/strong";
import TextLink from "@/shared/components/text-link";

const fileMemory = "packages/file-memory/src/index.ts";
const entry = "durable-counter/index.tsx";
const app = "durable-counter/src/app.tsx";

function Intro() {
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
    </>
  );
}

function MemoryInterface() {
  return (
    <>
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
        code={codeSample(fileMemory, "file-memory")}
        filename={t("docs.getting_started.state_and_memory.filename_memory")}
      />
    </>
  );
}

function UsingMemory() {
  return (
    <>
      <DocHeading level={2} id="using-memory">
        {t("docs.getting_started.state_and_memory.heading_using_memory")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.state_and_memory.using_memory_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(entry, "entry-point")}
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
    </>
  );
}

function UseAsyncOutput() {
  return (
    <>
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
        code={codeSample(app, "counter-handler")}
        filename={t("docs.getting_started.state_and_memory.filename_app")}
      />
    </>
  );
}

function WhatGetsPersisted() {
  return (
    <>
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
          k="docs.getting_started.state_and_memory.durable_counter_link"
          components={[
            (props) => (
              <TextLink href="#/docs/examples/durable-counter">
                {props.children}
              </TextLink>
            ),
          ]}
        />
      </p>
    </>
  );
}

const StateAndMemory: Component = () => (
  <>
    <Intro />
    <MemoryInterface />
    <UsingMemory />
    <UseAsyncOutput />
    <WhatGetsPersisted />
  </>
);

export default StateAndMemory;
