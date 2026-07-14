import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const manifest = "site-publisher/src/shared/manifest/index.ts";
const siteObject = "site-publisher/src/aws/site-object/index.tsx";

const Intro = () => (
  <>
    <h1>{t("docs.api.store.unwrap.title")}</h1>
    <p class="docs-description">{t("docs.api.store.unwrap.description")}</p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.store.unwrap.title")}
    signature={t("docs.api.store.unwrap.signature")}
    parameters={[
      [
        <Trans
          k="docs.api.store.unwrap.param_store_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.store.unwrap.param_store_type"
          components={[Code]}
        />,
        <Trans
          k="docs.api.store.unwrap.param_store_desc"
          components={[Code]}
        />,
      ],
    ]}
  />
);

const StoreSource = () => (
  <>
    <DocHeading level={3} id="the-store-source">
      {t("docs.api.store.unwrap.heading_the_store_source")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.store.unwrap.usage_the_store_source"
        components={[Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(manifest, "manifest-store")}
      filename={t("docs.api.store.unwrap.filename_manifest")}
    />
  </>
);

const SnapshottingProps = () => (
  <>
    <DocHeading level={3} id="snapshotting-props">
      {t("docs.api.store.unwrap.heading_snapshotting_props")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.store.unwrap.usage_snapshotting_props"
        components={[Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(siteObject, "object-props")}
      filename={t("docs.api.store.unwrap.filename_site_object")}
    />
  </>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.store.unwrap.in_the_wild"
      components={[
        (props) => (
          <TextLink href="#/docs/examples/site-publisher">
            {props.children}
          </TextLink>
        ),
      ]}
    />
  </p>
);

const Unwrap: Component = () => {
  return (
    <>
      <Intro />
      <Reference />
      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>
      <StoreSource />
      <SnapshottingProps />
      <InTheWild />
    </>
  );
};

export default Unwrap;
