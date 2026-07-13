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

const MergeProps: Component = () => {
  return (
    <>
      <h1>{t("docs.api.props.merge_props.title")}</h1>
      <p class="docs-description">
        {t("docs.api.props.merge_props.description")}
      </p>

      <ApiReference
        name={t("docs.api.props.merge_props.title")}
        signature={t("docs.api.props.merge_props.signature")}
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="bucket-defaults">
        {t("docs.api.props.merge_props.heading_bucket")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.props.merge_props.usage_bucket"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(siteBucket, "defaults")}
        filename={t("docs.api.props.merge_props.filename_site_bucket")}
      />

      <DocHeading level={3} id="tenant-defaults">
        {t("docs.api.props.merge_props.heading_tenant")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.props.merge_props.usage_tenant"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(tenantApp, "tree")}
        filename={t("docs.api.props.merge_props.filename_tenant_app")}
      />

      <p>
        <Trans
          k="docs.api.props.merge_props.in_the_wild"
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

export default MergeProps;
