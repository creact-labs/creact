import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import RichText from "@/shared/components/rich-text";

const samples = "getting-started-tour/src/components-jsx.tsx";

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
        <RichText k="docs.getting_started.components_jsx.jsx_intro" />
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
        <RichText k="docs.getting_started.components_jsx.fragments_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "fragments")}
        filename={t("docs.getting_started.components_jsx.filename_infra")}
      />

      <DocHeading level={2} id="reactive-props">
        {t("docs.getting_started.components_jsx.heading_reactive_props")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.components_jsx.reactive_props_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "reactive-props")}
        filename={t(
          "docs.getting_started.components_jsx.filename_reactive_props",
        )}
      />

      <Callout type="tip">
        <p>
          <RichText k="docs.getting_started.components_jsx.tip_access" />
        </p>
      </Callout>

      <DocHeading level={2} id="children">
        {t("docs.getting_started.components_jsx.heading_children")}
      </DocHeading>
      <p>
        <RichText k="docs.getting_started.components_jsx.children_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "children")}
        filename={t("docs.getting_started.components_jsx.filename_children")}
      />
    </>
  );
};

export default ComponentsJsx;
