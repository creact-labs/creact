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
    <Trans k="docs.api.reactive.on.param_deps_name" components={[Code]} />,
    <Trans k="docs.api.reactive.on.param_deps_type" components={[Code]} />,
    <Trans k="docs.api.reactive.on.param_deps_desc" />,
  ],
  [
    <Trans k="docs.api.reactive.on.param_fn_name" components={[Code]} />,
    <Trans k="docs.api.reactive.on.param_fn_type" components={[Code]} />,
    <Trans k="docs.api.reactive.on.param_fn_desc" components={[Code]} />,
  ],
  [
    <Trans k="docs.api.reactive.on.param_defer_name" components={[Code]} />,
    <Trans k="docs.api.reactive.on.param_defer_type" components={[Code]} />,
    <Trans k="docs.api.reactive.on.param_defer_desc" components={[Code]} />,
  ],
];

const Intro = () => (
  <>
    <h1>{t("docs.api.reactive.on.title")}</h1>
    <p class="docs-description">{t("docs.api.reactive.on.description")}</p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.reactive.on.title")}
    signature={t("docs.api.reactive.on.signature")}
    parameters={parameters}
  />
);

const StatusTransitions = () => (
  <>
    <DocHeading level={3} id="status-transitions">
      {t("docs.api.reactive.on.heading_status_transitions")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.reactive.on.usage_status_transitions"
        components={[Code, Code, Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(httpCheck, "transitions")}
      filename={t("docs.api.reactive.on.filename_http_check")}
    />
  </>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.reactive.on.in_the_wild"
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
    <StatusTransitions />
    <InTheWild />
  </>
);

const On: Component = () => (
  <>
    <Intro />
    <Reference />
    <Usage />
  </>
);

export default On;
