import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const httpCheck = "uptime-monitor/src/components/http-check/index.tsx";
const httpChannel = "page-writer/src/components/http-channel/index.tsx";

const Intro = () => (
  <>
    <h1>{t("docs.api.lifecycle.on_cleanup.title")}</h1>
    <p class="docs-description">
      {t("docs.api.lifecycle.on_cleanup.description")}
    </p>
    <DocCodeBlock
      code={codeSample(httpCheck, "sweep-lifecycle")}
      filename={t("docs.api.lifecycle.on_cleanup.filename_http_check")}
    />
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.lifecycle.on_cleanup.title")}
    signature={t("docs.api.lifecycle.on_cleanup.signature")}
    parameters={[
      [
        <Trans
          k="docs.api.lifecycle.on_cleanup.param_fn_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.lifecycle.on_cleanup.param_fn_type"
          components={[Code]}
        />,
        <Trans k="docs.api.lifecycle.on_cleanup.param_fn_desc" />,
      ],
    ]}
    returns={
      <p>
        <Trans k="docs.api.lifecycle.on_cleanup.returns_desc" />
      </p>
    }
  />
);

const ClearingATimer = () => (
  <>
    <DocHeading level={3} id="clearing-a-timer">
      {t("docs.api.lifecycle.on_cleanup.heading_timer")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.lifecycle.on_cleanup.usage_timer"
        components={[Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(httpCheck, "sweep-lifecycle")}
      filename={t("docs.api.lifecycle.on_cleanup.filename_http_check")}
    />
  </>
);

const ClosingAServer = () => (
  <>
    <DocHeading level={3} id="closing-a-server">
      {t("docs.api.lifecycle.on_cleanup.heading_server")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.lifecycle.on_cleanup.usage_server"
        components={[Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(httpChannel, "server")}
      filename={t("docs.api.lifecycle.on_cleanup.filename_http_channel")}
    />
  </>
);

const NoOwnerCallout = () => (
  <Callout type="warning">
    <p>
      <Trans
        k="docs.api.lifecycle.on_cleanup.warning_no_owner"
        components={[Code, Code, Code]}
      />
    </p>
  </Callout>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.lifecycle.on_cleanup.in_the_wild"
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

const OnCleanup: Component = () => {
  return (
    <>
      <Intro />
      <Reference />
      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>
      <ClearingATimer />
      <ClosingAServer />
      <NoOwnerCallout />
      <InTheWild />
    </>
  );
};

export default OnCleanup;
