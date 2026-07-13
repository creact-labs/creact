import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import TextLink from "@/shared/components/text-link";
import UsageSection from "@/shared/components/usage-section";

const page = "page-writer/src/components/page/index.tsx";

const Intro = () => (
  <>
    <h1>{t("docs.api.owner.run_with_owner.title")}</h1>
    <p class="docs-description">
      {t("docs.api.owner.run_with_owner.description")}
    </p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.owner.run_with_owner.title")}
    signature={t("docs.api.owner.run_with_owner.signature")}
    parameters={[
      [
        <Trans
          k="docs.api.owner.run_with_owner.param_owner_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.owner.run_with_owner.param_owner_type"
          components={[Code]}
        />,
        <Trans
          k="docs.api.owner.run_with_owner.param_owner_desc"
          components={[Code, Code]}
        />,
      ],
      [
        <Trans
          k="docs.api.owner.run_with_owner.param_fn_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.owner.run_with_owner.param_fn_type"
          components={[Code]}
        />,
        <Trans
          k="docs.api.owner.run_with_owner.param_fn_desc"
          components={[Code]}
        />,
      ],
    ]}
  />
);

const DeployWrite = () => (
  <UsageSection
    code={codeSample(page, "deploy-write")}
    filename={t("docs.api.owner.run_with_owner.filename_page")}
  >
    <p>
      <Trans
        k="docs.api.owner.run_with_owner.usage_deploy_write"
        components={[Code, Code, Code]}
      />
    </p>
  </UsageSection>
);

const AsyncOwnerCallout = () => (
  <Callout type="info">
    <p>
      <Trans
        k="docs.api.owner.run_with_owner.info_async_owner"
        components={[Code, Code, Code]}
      />
    </p>
  </Callout>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.owner.run_with_owner.in_the_wild"
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

const RunWithOwner: Component = () => {
  return (
    <>
      <Intro />
      <Reference />
      <DeployWrite />
      <AsyncOwnerCallout />
      <InTheWild />
    </>
  );
};

export default RunWithOwner;
