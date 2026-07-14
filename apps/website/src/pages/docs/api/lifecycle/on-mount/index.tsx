import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import TextLink from "@/shared/components/text-link";
import UsageSection from "@/shared/components/usage-section";

const httpCheck = "uptime-monitor/src/components/http-check/index.tsx";

const Intro = () => (
  <>
    <h1>{t("docs.api.lifecycle.on_mount.title")}</h1>
    <p class="docs-description">
      {t("docs.api.lifecycle.on_mount.description")}
    </p>
    <DocCodeBlock
      code={codeSample(httpCheck, "sweep-lifecycle")}
      filename={t("docs.api.lifecycle.on_mount.filename_http_check")}
    />
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.lifecycle.on_mount.title")}
    signature={t("docs.api.lifecycle.on_mount.signature")}
    parameters={[
      [
        <Trans
          k="docs.api.lifecycle.on_mount.param_fn_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.lifecycle.on_mount.param_fn_type"
          components={[Code]}
        />,
        <Trans k="docs.api.lifecycle.on_mount.param_fn_desc" />,
      ],
    ]}
  />
);

const Sweep = () => (
  <UsageSection
    code={codeSample(httpCheck, "sweep-lifecycle")}
    filename={t("docs.api.lifecycle.on_mount.filename_http_check")}
  >
    <p>
      <Trans
        k="docs.api.lifecycle.on_mount.usage_sweep"
        components={[Code, Code, Code]}
      />
    </p>
  </UsageSection>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.lifecycle.on_mount.in_the_wild"
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

const OnMount: Component = () => {
  return (
    <>
      <Intro />
      <Reference />
      <Sweep />
      <InTheWild />
    </>
  );
};

export default OnMount;
