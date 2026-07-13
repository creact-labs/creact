import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const siteBucket = "site-publisher/src/aws/site-bucket/index.tsx";
const tenantApp = "tenant-fleet/src/components/tenant-app/index.tsx";

const SplitProps: Component = () => {
  return (
    <>
      <h1>{t("docs.api.props.split_props.title")}</h1>
      <p class="docs-description">
        {t("docs.api.props.split_props.description")}
      </p>

      <ApiReference
        name={t("docs.api.props.split_props.title")}
        signature={t("docs.api.props.split_props.signature")}
      />
      <p>{t("docs.api.props.split_props.behavior")}</p>

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="bucket-groups">
        {t("docs.api.props.split_props.heading_bucket")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.props.split_props.usage_bucket"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(siteBucket, "defaults")}
        filename={t("docs.api.props.split_props.filename_site_bucket")}
      />

      <DocHeading level={3} id="tenant-groups">
        {t("docs.api.props.split_props.heading_tenant")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.props.split_props.usage_tenant"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(tenantApp, "database")}
        filename={t("docs.api.props.split_props.filename_tenant_app")}
      />

      <p>
        <Trans
          k="docs.api.props.split_props.in_the_wild"
          components={[
            (props) => (
              <TextLink href="#/docs/examples/site-publisher">
                {props.children}
              </TextLink>
            ),
          ]}
        />
      </p>
    </>
  );
};

export default SplitProps;
