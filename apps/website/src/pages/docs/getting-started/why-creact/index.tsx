import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import Strong from "@/shared/components/strong";
import TextLink from "@/shared/components/text-link";

const app = "durable-counter/src/app.tsx";

function Intro() {
  return (
    <>
      <h1>{t("docs.getting_started.why_creact.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.why_creact.description")}
      </p>
    </>
  );
}

function TheIdea() {
  return (
    <>
      <DocHeading level={2} id="the-one-idea">
        {t("docs.getting_started.why_creact.heading_idea")}
      </DocHeading>
      <p>{t("docs.getting_started.why_creact.idea_intro")}</p>
      <ol>
        <li>
          <Strong>{t("docs.getting_started.why_creact.idea_declare_term")}</Strong>{" "}
          — {t("docs.getting_started.why_creact.idea_declare")}
        </li>
        <li>
          <Strong>{t("docs.getting_started.why_creact.idea_reconcile_term")}</Strong>{" "}
          — {t("docs.getting_started.why_creact.idea_reconcile")}
        </li>
        <li>
          <Strong>{t("docs.getting_started.why_creact.idea_persist_term")}</Strong>{" "}
          — {t("docs.getting_started.why_creact.idea_persist")}
        </li>
      </ol>
      <p>{t("docs.getting_started.why_creact.idea_outro")}</p>
    </>
  );
}

function FirstLook() {
  return (
    <>
      <DocHeading level={2} id="a-first-look">
        {t("docs.getting_started.why_creact.heading_first_look")}
      </DocHeading>
      <p>{t("docs.getting_started.why_creact.first_look_intro")}</p>
      <DocCodeBlock
        code={codeSample(app, "counter")}
        filename={t("docs.getting_started.why_creact.filename_counter")}
      />
      <p>
        <Trans
          k="docs.getting_started.why_creact.first_look_notice"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function Handlers() {
  return (
    <>
      <DocHeading level={2} id="handlers-and-durability">
        {t("docs.getting_started.why_creact.heading_handlers")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.why_creact.handlers_intro"
          components={[Code, Strong]}
        />
      </p>
      <ul>
        <li>{t("docs.getting_started.why_creact.handlers_idempotent")}</li>
        <li>
          <Trans
            k="docs.getting_started.why_creact.handlers_prev"
            components={[Code, Code]}
          />
        </li>
      </ul>
      <p>{t("docs.getting_started.why_creact.handlers_outro")}</p>
    </>
  );
}

function VsReact() {
  return (
    <>
      <DocHeading level={2} id="if-you-know-react">
        {t("docs.getting_started.why_creact.heading_vs_react")}
      </DocHeading>
      <p>{t("docs.getting_started.why_creact.vs_react_intro")}</p>
      <ul>
        <li>{t("docs.getting_started.why_creact.vs_react_once")}</li>
        <li>{t("docs.getting_started.why_creact.vs_react_reactivity")}</li>
        <li>{t("docs.getting_started.why_creact.vs_react_jsx")}</li>
        <li>{t("docs.getting_started.why_creact.vs_react_state")}</li>
      </ul>
    </>
  );
}

function Vocabulary() {
  return (
    <>
      <DocHeading level={2} id="the-words-we-use">
        {t("docs.getting_started.why_creact.heading_vocabulary")}
      </DocHeading>
      <p>{t("docs.getting_started.why_creact.vocabulary_intro")}</p>
      <dl>
        <dt>{t("docs.getting_started.why_creact.vocab_component_term")}</dt>
        <dd>{t("docs.getting_started.why_creact.vocab_component")}</dd>
        <dt>{t("docs.getting_started.why_creact.vocab_signal_term")}</dt>
        <dd>
          <Trans
            k="docs.getting_started.why_creact.vocab_signal"
            components={[Code]}
          />
        </dd>
        <dt>{t("docs.getting_started.why_creact.vocab_handler_term")}</dt>
        <dd>
          <Trans
            k="docs.getting_started.why_creact.vocab_handler"
            components={[Code]}
          />
        </dd>
        <dt>{t("docs.getting_started.why_creact.vocab_output_term")}</dt>
        <dd>{t("docs.getting_started.why_creact.vocab_output")}</dd>
        <dt>{t("docs.getting_started.why_creact.vocab_resource_term")}</dt>
        <dd>{t("docs.getting_started.why_creact.vocab_resource")}</dd>
        <dt>{t("docs.getting_started.why_creact.vocab_memory_term")}</dt>
        <dd>{t("docs.getting_started.why_creact.vocab_memory")}</dd>
        <dt>{t("docs.getting_started.why_creact.vocab_stack_term")}</dt>
        <dd>{t("docs.getting_started.why_creact.vocab_stack")}</dd>
      </dl>
    </>
  );
}

function Next() {
  return (
    <>
      <DocHeading level={2} id="where-to-go-next">
        {t("docs.getting_started.why_creact.heading_next")}
      </DocHeading>
      <p>{t("docs.getting_started.why_creact.next_intro")}</p>
      <ul>
        <li>
          <TextLink href="#/docs/getting-started/installation">
            {t("docs.getting_started.why_creact.next_install")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/examples/durable-counter">
            {t("docs.getting_started.why_creact.next_counter")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/runtime/use-async-output">
            {t("docs.getting_started.why_creact.next_useasyncoutput")}
          </TextLink>
        </li>
      </ul>
    </>
  );
}

const WhyCreact: Component = () => {
  return (
    <>
      <Intro />
      <TheIdea />
      <FirstLook />
      <Handlers />
      <VsReact />
      <Vocabulary />
      <Next />
    </>
  );
};

export default WhyCreact;
