import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const samples = "durable-counter/src/flow-control.tsx";

const FlowControl: Component = () => {
  return (
    <>
      <h1>{t("docs.getting_started.flow_control.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.flow_control.description")}
      </p>

      <DocHeading level={2} id="show">
        {t("docs.getting_started.flow_control.heading_show")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.flow_control.show_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock code={codeSample(samples, "show")} />

      <p>{t("docs.getting_started.flow_control.show_callback_intro")}</p>
      <DocCodeBlock code={codeSample(samples, "show-value")} />

      <DocHeading level={2} id="for">
        {t("docs.getting_started.flow_control.heading_for")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.flow_control.for_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock code={codeSample(samples, "for")} />

      <DocHeading level={2} id="switch">
        {t("docs.getting_started.flow_control.heading_switch")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.flow_control.switch_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock code={codeSample(samples, "switch")} />

      <DocHeading level={2} id="error-boundary">
        {t("docs.getting_started.flow_control.heading_error_boundary")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.flow_control.error_boundary_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock code={codeSample(samples, "error-boundary")} />

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
};

export default FlowControl;
