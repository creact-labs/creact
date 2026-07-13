import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import Strong from "@/shared/components/strong";

const counterApp = "durable-counter/src/app.tsx";
const monitorApp = "uptime-monitor/src/app.tsx";

const ComponentsJsx: Component = () => {
  return (
    <>
      <h1>{t("docs.getting_started.components_jsx.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.components_jsx.description")}
      </p>

      <DocHeading level={2} id="what-is-jsx">
        {t("docs.getting_started.components_jsx.heading_jsx")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.components_jsx.jsx_intro"
          components={[Strong, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(counterApp, "app")}
        filename={t("docs.getting_started.components_jsx.filename_app")}
      />

      <DocHeading level={2} id="component-functions">
        {t("docs.getting_started.components_jsx.heading_component_functions")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.components_jsx.component_functions_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(counterApp, "counter")}
        filename={t("docs.getting_started.components_jsx.filename_app")}
      />

      <DocHeading level={2} id="composing-resources">
        {t("docs.getting_started.components_jsx.heading_composing")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.components_jsx.composing_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(monitorApp, "layout")}
        filename={t("docs.getting_started.components_jsx.filename_monitor")}
      />

      <Callout type="tip">
        <p>
          <Trans
            k="docs.getting_started.components_jsx.tip_reactive_props"
            components={[Code, Code]}
          />
        </p>
      </Callout>
    </>
  );
};

export default ComponentsJsx;
