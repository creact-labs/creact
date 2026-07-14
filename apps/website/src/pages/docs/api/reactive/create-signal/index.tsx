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
const httpCheck = "uptime-monitor/src/components/http-check/index.tsx";

const parameters = [
  [
    <Trans
      k="docs.api.reactive.create_signal.param_value_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_signal.param_value_type"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_signal.param_value_desc"
      components={[Code]}
    />,
  ],
  [
    <Trans
      k="docs.api.reactive.create_signal.param_options_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_signal.param_options_type"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_signal.param_options_desc"
      components={[Code, Code]}
    />,
  ],
];

const Intro = () => (
  <>
    <h1>{t("docs.api.reactive.create_signal.title")}</h1>
    <p class="docs-description">
      {t("docs.api.reactive.create_signal.description")}
    </p>
  </>
);

const Returns = () => (
  <>
    <p>
      <Trans
        k="docs.api.reactive.create_signal.returns_intro"
        components={[Code]}
      />
    </p>
    <ul>
      <li>
        <Trans
          k="docs.api.reactive.create_signal.returns_getter"
          components={[Code]}
        />
      </li>
      <li>
        <Trans
          k="docs.api.reactive.create_signal.returns_setter"
          components={[Code, Code]}
        />
      </li>
    </ul>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.reactive.create_signal.title")}
    signature={t("docs.api.reactive.create_signal.signature")}
    parameters={parameters}
    returns={<Returns />}
  />
);

const SweepState = () => (
  <>
    <DocHeading level={3} id="sweep-state">
      {t("docs.api.reactive.create_signal.heading_sweep_state")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.reactive.create_signal.usage_sweep_state"
        components={[Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(app, "sweep-state")}
      filename={t("docs.api.reactive.create_signal.filename_app")}
    />
  </>
);

const LatestProbe = () => (
  <>
    <DocHeading level={3} id="latest-probe">
      {t("docs.api.reactive.create_signal.heading_latest_probe")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.reactive.create_signal.usage_latest_probe"
        components={[Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(httpCheck, "sweep")}
      filename={t("docs.api.reactive.create_signal.filename_http_check")}
    />
  </>
);

const Tip = () => (
  <Callout type="tip">
    <p>
      <Trans
        k="docs.api.reactive.create_signal.tip_equality"
        components={[Code]}
      />
    </p>
  </Callout>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.reactive.create_signal.in_the_wild"
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
    <SweepState />
    <LatestProbe />
    <Tip />
    <InTheWild />
  </>
);

const CreateSignal: Component = () => (
  <>
    <Intro />
    <Reference />
    <Usage />
  </>
);

export default CreateSignal;
