import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const httpCheck = "uptime-monitor/src/components/http-check/index.tsx";

const parameters = [
  [
    <Trans k="docs.api.reactive.untrack.param_fn_name" components={[Code]} />,
    <Trans k="docs.api.reactive.untrack.param_fn_type" components={[Code]} />,
    <Trans k="docs.api.reactive.untrack.param_fn_desc" />,
  ],
];

const Intro = () => (
  <>
    <h1>{t("docs.api.reactive.untrack.title")}</h1>
    <p class="docs-description">
      {t("docs.api.reactive.untrack.description")}
    </p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.reactive.untrack.title")}
    signature={t("docs.api.reactive.untrack.signature")}
    parameters={parameters}
  />
);

const ReadingAside = () => (
  <>
    <DocHeading level={3} id="reading-aside">
      {t("docs.api.reactive.untrack.heading_reading_aside")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.reactive.untrack.usage_reading_aside"
        components={[Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(httpCheck, "transitions")}
      filename={t("docs.api.reactive.untrack.filename_http_check")}
    />
  </>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.reactive.untrack.in_the_wild"
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
    <ReadingAside />
    <InTheWild />
  </>
);

const Untrack: Component = () => (
  <>
    <Intro />
    <Reference />
    <Usage />
  </>
);

export default Untrack;
