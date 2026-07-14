import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";
import PlaygroundLink from "@/shared/components/playground-link";

const app = "durable-counter/src/app.tsx";

function Intro() {
  return (
    <>
      <h1>{t("docs.examples.durable_counter.title")}</h1>
      <p class="docs-description">
        {t("docs.examples.durable_counter.description")}
      </p>
    </>
  );
}

function RunIt() {
  return (
    <>
      <DocHeading level={2} id="run-it">
        {t("docs.examples.durable_counter.heading_run")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.durable_counter.run_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.durable_counter.code_run")}
        filename={t("docs.examples.durable_counter.filename_terminal")}
      />
      <p>{t("docs.examples.durable_counter.run_output_intro")}</p>
      <PlaygroundLink app="durable-counter" />
      <p>
        <Trans
          k="docs.examples.durable_counter.run_loop"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.durable_counter.code_run_resume")}
        filename={t("docs.examples.durable_counter.filename_terminal")}
      />
      <p>
        <Trans k="docs.examples.durable_counter.run_note" components={[Code]} />
      </p>
    </>
  );
}

function EntryPoint() {
  return (
    <>
      <DocHeading level={2} id="entry-point">
        {t("docs.examples.durable_counter.heading_entry")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.durable_counter.entry_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample("durable-counter/index.tsx", "entry-point")}
        filename={t("docs.examples.durable_counter.filename_entry")}
      />
      <p>
        <Trans
          k="docs.examples.durable_counter.entry_notice"
          components={[Code, Code, Code]}
        />
      </p>
    </>
  );
}

function FileMemory() {
  return (
    <>
      <DocHeading level={2} id="file-memory">
        {t("docs.examples.durable_counter.heading_file_memory")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.durable_counter.file_memory_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample("packages/file-memory/src/index.ts", "file-memory")}
        filename={t("docs.examples.durable_counter.filename_file_memory")}
      />
      <p>
        <Trans
          k="docs.examples.durable_counter.file_memory_notice"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function CounterHandler() {
  return (
    <>
      <DocHeading level={2} id="counter-handler">
        {t("docs.examples.durable_counter.heading_handler")}
      </DocHeading>
      <p>{t("docs.examples.durable_counter.handler_intro")}</p>
      <DocCodeBlock
        code={codeSample(app, "counter-handler")}
        filename={t("docs.examples.durable_counter.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.durable_counter.handler_notice"
          components={[Code, Code]}
        />
      </p>
      <p>{t("docs.examples.durable_counter.handler_rerun_notice")}</p>
    </>
  );
}

function CounterComponent() {
  return (
    <>
      <DocHeading level={2} id="counter-component">
        {t("docs.examples.durable_counter.heading_counter")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.durable_counter.counter_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "counter")}
        filename={t("docs.examples.durable_counter.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.durable_counter.counter_notice"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function AppSection() {
  return (
    <>
      <DocHeading level={2} id="app">
        {t("docs.examples.durable_counter.heading_app")}
      </DocHeading>
      <p>{t("docs.examples.durable_counter.app_intro")}</p>
      <DocCodeBlock
        code={codeSample(app, "app")}
        filename={t("docs.examples.durable_counter.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.durable_counter.app_notice"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function Recap() {
  return (
    <>
      <DocHeading level={2} id="recap">
        {t("docs.examples.durable_counter.heading_recap")}
      </DocHeading>
      <ul>
        <li>
          <Trans
            k="docs.examples.durable_counter.recap_durable_outputs"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.durable_counter.recap_prev"
            components={[Code]}
          />
        </li>
        <li>{t("docs.examples.durable_counter.recap_rerun")}</li>
        <li>{t("docs.examples.durable_counter.recap_cleanup")}</li>
      </ul>
    </>
  );
}

function ApisUsed() {
  return (
    <>
      <DocHeading level={2} id="apis-used">
        {t("docs.examples.durable_counter.heading_apis")}
      </DocHeading>
      <ul>
        <li>
          <TextLink href="#/docs/api/runtime/render">
            {t("docs.examples.durable_counter.api_render")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/runtime/use-async-output">
            {t("docs.examples.durable_counter.api_use_async_output")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/create-signal">
            {t("docs.examples.durable_counter.api_create_signal")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/create-effect">
            {t("docs.examples.durable_counter.api_create_effect")}
          </TextLink>
        </li>
      </ul>
    </>
  );
}

function TryIt() {
  return (
    <>
      <DocHeading level={2} id="try-it">
        {t("docs.examples.durable_counter.heading_try")}
      </DocHeading>
      <p>
        <Trans k="docs.examples.durable_counter.try_it" components={[Code]} />
      </p>
    </>
  );
}

const DurableCounter: Component = () => {
  return (
    <>
      <Intro />
      <RunIt />
      <EntryPoint />
      <FileMemory />
      <CounterHandler />
      <CounterComponent />
      <AppSection />
      <Recap />
      <ApisUsed />
      <TryIt />
    </>
  );
};

export default DurableCounter;
