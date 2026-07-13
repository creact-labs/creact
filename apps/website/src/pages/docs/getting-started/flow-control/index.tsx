import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const monitorApp = "uptime-monitor/src/app.tsx";
const page = "page-writer/src/components/page/index.tsx";

function Intro() {
  return (
    <>
      <h1>{t("docs.getting_started.flow_control.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.flow_control.description")}
      </p>
    </>
  );
}

function OneTree() {
  return (
    <>
      <DocHeading level={2} id="one-tree">
        {t("docs.getting_started.flow_control.heading_one_tree")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.flow_control.one_tree_intro"
          components={[Code, Code, Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(monitorApp, "layout")}
        filename={t("docs.getting_started.flow_control.filename_monitor")}
      />

      <Callout type="info">
        <p>
          <Trans
            k="docs.getting_started.flow_control.info_accessor_conditions"
            components={[Code]}
          />
        </p>
      </Callout>
    </>
  );
}

function SwitchStates() {
  return (
    <>
      <DocHeading level={2} id="switch-states">
        {t("docs.getting_started.flow_control.heading_switch_states")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.flow_control.switch_states_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(page, "states")}
        filename={t("docs.getting_started.flow_control.filename_page")}
      />
    </>
  );
}

const FlowControl: Component = () => (
  <>
    <Intro />
    <OneTree />
    <SwitchStates />
  </>
);

export default FlowControl;
