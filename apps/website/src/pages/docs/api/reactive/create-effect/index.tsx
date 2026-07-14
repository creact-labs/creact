import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const counterApp = "durable-counter/src/app.tsx";
const statusPage = "uptime-monitor/src/components/status-page/index.tsx";

const parameters = [
  [
    <Trans
      k="docs.api.reactive.create_effect.param_fn_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_effect.param_fn_type"
      components={[Code]}
    />,
    <Trans k="docs.api.reactive.create_effect.param_fn_desc" />,
  ],
  [
    <Trans
      k="docs.api.reactive.create_effect.param_value_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_effect.param_value_type"
      components={[Code]}
    />,
    <Trans k="docs.api.reactive.create_effect.param_value_desc" />,
  ],
  [
    <Trans
      k="docs.api.reactive.create_effect.param_options_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_effect.param_options_type"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_effect.param_options_desc"
      components={[Code]}
    />,
  ],
];

const Intro = () => (
  <>
    <h1>{t("docs.api.reactive.create_effect.title")}</h1>
    <p class="docs-description">
      {t("docs.api.reactive.create_effect.description")}
    </p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.reactive.create_effect.title")}
    signature={t("docs.api.reactive.create_effect.signature")}
    parameters={parameters}
  />
);

const DurableOutputs = () => (
  <>
    <DocHeading level={3} id="durable-outputs">
      {t("docs.api.reactive.create_effect.heading_durable_outputs")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.reactive.create_effect.usage_durable_outputs"
        components={[Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(counterApp, "counter")}
      filename={t("docs.api.reactive.create_effect.filename_counter")}
    />
  </>
);

const PublishStatusPage = () => (
  <>
    <DocHeading level={3} id="publish-status-page">
      {t("docs.api.reactive.create_effect.heading_publish")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.reactive.create_effect.usage_publish"
        components={[Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(statusPage, "write-effect")}
      filename={t("docs.api.reactive.create_effect.filename_status_page")}
    />
  </>
);

const Info = () => (
  <Callout type="info">
    <p>
      <Trans
        k="docs.api.reactive.create_effect.info_batching"
        components={[Code]}
      />
    </p>
  </Callout>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.reactive.create_effect.in_the_wild"
      components={[
        (props) => (
          <TextLink href="#/docs/examples/durable-counter">
            {props.children}
          </TextLink>
        ),
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
    <DurableOutputs />
    <PublishStatusPage />
    <Info />
    <InTheWild />
  </>
);

const CreateEffect: Component = () => (
  <>
    <Intro />
    <Reference />
    <Usage />
  </>
);

export default CreateEffect;
