import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import Strong from "@/shared/components/strong";

const samples = "durable-counter/src/components-jsx.tsx";

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
          components={[Strong, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "resources")}
        filename={t("docs.getting_started.components_jsx.filename_app")}
      />

      <DocHeading level={2} id="component-functions">
        {t("docs.getting_started.components_jsx.heading_component_functions")}
      </DocHeading>
      <p>
        {t("docs.getting_started.components_jsx.component_functions_intro")}
      </p>
      <DocCodeBlock
        code={codeSample(samples, "component-functions")}
        filename={t("docs.getting_started.components_jsx.filename_counter")}
      />

      <DocHeading level={2} id="fragments">
        {t("docs.getting_started.components_jsx.heading_fragments")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.components_jsx.fragments_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "fragments")}
        filename={t("docs.getting_started.components_jsx.filename_infra")}
      />

      <DocHeading level={2} id="reactive-props">
        {t("docs.getting_started.components_jsx.heading_reactive_props")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.components_jsx.reactive_props_intro"
          components={[Strong]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "reactive-props")}
        filename={t(
          "docs.getting_started.components_jsx.filename_reactive_props",
        )}
      />

      <Callout type="tip">
        <p>
          <Trans
            k="docs.getting_started.components_jsx.tip_access"
            components={[Code, Code, Code, Code, Code]}
          />
        </p>
      </Callout>

      <DocHeading level={2} id="children">
        {t("docs.getting_started.components_jsx.heading_children")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.components_jsx.children_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "children")}
        filename={t("docs.getting_started.components_jsx.filename_children")}
      />
    </>
  );
};

export default ComponentsJsx;
