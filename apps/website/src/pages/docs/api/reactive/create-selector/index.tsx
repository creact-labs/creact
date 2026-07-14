import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const app = "page-writer/src/app.tsx";

const parameters = [
  [
    <Trans
      k="docs.api.reactive.create_selector.param_source_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_selector.param_source_type"
      components={[Code]}
    />,
    <Trans k="docs.api.reactive.create_selector.param_source_desc" />,
  ],
  [
    <Trans
      k="docs.api.reactive.create_selector.param_fn_name"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_selector.param_fn_type"
      components={[Code]}
    />,
    <Trans
      k="docs.api.reactive.create_selector.param_fn_desc"
      components={[Code]}
    />,
  ],
];

const Intro = () => (
  <>
    <h1>{t("docs.api.reactive.create_selector.title")}</h1>
    <p class="docs-description">
      {t("docs.api.reactive.create_selector.description")}
    </p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.reactive.create_selector.title")}
    signature={t("docs.api.reactive.create_selector.signature")}
    parameters={parameters}
    returns={
      <p>
        <Trans
          k="docs.api.reactive.create_selector.returns_body"
          components={[Code, Code, Code]}
        />
      </p>
    }
  />
);

const LatestRequest = () => (
  <>
    <DocHeading level={3} id="latest-request">
      {t("docs.api.reactive.create_selector.heading_latest_request")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.reactive.create_selector.usage_latest_request"
        components={[Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(app, "wiring")}
      filename={t("docs.api.reactive.create_selector.filename_app")}
    />
  </>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.reactive.create_selector.in_the_wild"
      components={[
        (props) => (
          <TextLink href="#/docs/examples/page-writer">
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
    <LatestRequest />
    <InTheWild />
  </>
);

const CreateSelector: Component = () => (
  <>
    <Intro />
    <Reference />
    <Usage />
  </>
);

export default CreateSelector;
