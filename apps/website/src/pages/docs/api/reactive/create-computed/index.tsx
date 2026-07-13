import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const app = "uptime-monitor/src/app.tsx";

const parameters = [
  [
    <Trans
      k="docs.api.reactive.create_computed.param_fn_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_computed.param_fn_type"
      components={[Code]}
    />,
    <Trans k="docs.api.reactive.create_computed.param_fn_desc" />,
  ],
  [
    <Trans
      k="docs.api.reactive.create_computed.param_value_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_computed.param_value_type"
      components={[Code]}
    />,
    <Trans k="docs.api.reactive.create_computed.param_value_desc" />,
  ],
  [
    <Trans
      k="docs.api.reactive.create_computed.param_options_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_computed.param_options_type"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_computed.param_options_desc"
      components={[Code]}
    />,
  ],
];

const Intro = () => (
  <>
    <h1>{t("docs.api.reactive.create_computed.title")}</h1>
    <p class="docs-description">
      {t("docs.api.reactive.create_computed.description")}
    </p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.reactive.create_computed.title")}
    signature={t("docs.api.reactive.create_computed.signature")}
    parameters={parameters}
  />
);

const TrackingIncidents = () => (
  <>
    <DocHeading level={3} id="tracking-incidents">
      {t("docs.api.reactive.create_computed.heading_tracking_incidents")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.reactive.create_computed.usage_tracking_incidents"
        components={[Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(app, "incidents")}
      filename={t("docs.api.reactive.create_computed.filename_app")}
    />
  </>
);

const Warning = () => (
  <Callout type="warning">
    <p>
      <Trans
        k="docs.api.reactive.create_computed.warning_prefer_memo"
        components={[Code, Code]}
      />
    </p>
  </Callout>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.reactive.create_computed.in_the_wild"
      components={[
        (props) => (
          <TextLink href="#/docs/examples/uptime-monitor">
            {props.children}
          </TextLink>
        ),
      ]}
    />
  </p>
);

const Usage = () => (
  <>
    <DocHeading level={2} id="usage">
      {t("docs.ui.usage")}
    </DocHeading>
    <TrackingIncidents />
    <Warning />
    <InTheWild />
  </>
);

const CreateComputed: Component = () => (
  <>
    <Intro />
    <Reference />
    <Usage />
  </>
);

export default CreateComputed;
