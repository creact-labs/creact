import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const provider = "site-publisher/src/aws/provider/index.tsx";
const bucket = "site-publisher/src/aws/site-bucket/index.tsx";
const object = "site-publisher/src/aws/site-object/index.tsx";

function IntroSection() {
  return (
    <>
      <h1>{t("docs.guides.aws_integration.title")}</h1>
      <p class="docs-description">
        {t("docs.guides.aws_integration.description")}
      </p>
    </>
  );
}

function ProviderSection() {
  return (
    <>
      <DocHeading level={2} id="aws-provider">
        {t("docs.guides.aws_integration.heading_aws_provider")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.aws_integration.provider_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(provider, "provider")}
        filename={t("docs.guides.aws_integration.filename_provider")}
      />
      <p>
        <Trans
          k="docs.guides.aws_integration.provider_notice"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function EnsureBucketSection() {
  return (
    <>
      <DocHeading level={2} id="ensure-bucket">
        {t("docs.guides.aws_integration.heading_ensure_bucket")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.aws_integration.ensure_bucket_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(bucket, "ensure-bucket")}
        filename={t("docs.guides.aws_integration.filename_bucket")}
      />
      <p>
        <Trans
          k="docs.guides.aws_integration.ensure_bucket_notice"
          components={[Code]}
        />
      </p>
    </>
  );
}

function WebsiteConfigSection() {
  return (
    <>
      <DocHeading level={2} id="website-config">
        {t("docs.guides.aws_integration.heading_website_config")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.aws_integration.website_config_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(bucket, "website-config")}
        filename={t("docs.guides.aws_integration.filename_bucket")}
      />
      <p>
        <Trans
          k="docs.guides.aws_integration.website_config_notice"
          components={[Code]}
        />
      </p>
    </>
  );
}

function ChangedCheckSection() {
  return (
    <>
      <DocHeading level={2} id="changed-check">
        {t("docs.guides.aws_integration.heading_changed_check")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.aws_integration.changed_check_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(object, "changed-check")}
        filename={t("docs.guides.aws_integration.filename_object")}
      />
      <p>
        <Trans
          k="docs.guides.aws_integration.changed_check_notice"
          components={[Code]}
        />
      </p>
    </>
  );
}

function UploadSection() {
  return (
    <>
      <DocHeading level={2} id="upload">
        {t("docs.guides.aws_integration.heading_upload")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.aws_integration.upload_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(object, "upload")}
        filename={t("docs.guides.aws_integration.filename_object")}
      />
    </>
  );
}

function ClosingSection() {
  return (
    <>
      <Callout type="warning">
        <p>
          <Trans k="docs.guides.aws_integration.warning_idempotent" />
        </p>
      </Callout>
      <p>
        <Trans
          k="docs.guides.aws_integration.see_walkthrough"
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
}

const AwsIntegration: Component = () => {
  return (
    <>
      <IntroSection />
      <ProviderSection />
      <EnsureBucketSection />
      <WebsiteConfigSection />
      <ChangedCheckSection />
      <UploadSection />
      <ClosingSection />
    </>
  );
};

export default AwsIntegration;
