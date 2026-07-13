import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const samples = "integrations/src/aws-integration.tsx";

const AwsIntegration: Component = () => {
  return (
    <>
      <h1>{t("docs.guides.aws_integration.title")}</h1>
      <p class="docs-description">
        {t("docs.guides.aws_integration.description")}
      </p>

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
        code={codeSample(samples, "provider")}
        filename={t("docs.guides.aws_integration.filename_provider")}
      />

      <DocHeading level={2} id="bucket-component">
        {t("docs.guides.aws_integration.heading_bucket_component")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.aws_integration.bucket_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "bucket")}
        filename={t("docs.guides.aws_integration.filename_bucket")}
      />

      <DocHeading level={2} id="s3-file">
        {t("docs.guides.aws_integration.heading_s3_file")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.aws_integration.s3_file_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "s3-file")}
        filename={t("docs.guides.aws_integration.filename_s3_file")}
      />

      <DocHeading level={2} id="website-component">
        {t("docs.guides.aws_integration.heading_website_component")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.aws_integration.website_intro"
          components={[Code, Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "website")}
        filename={t("docs.guides.aws_integration.filename_website")}
      />

      <DocHeading level={2} id="multiple-resources">
        {t("docs.guides.aws_integration.heading_multiple_resources")}
      </DocHeading>
      <DocCodeBlock
        code={codeSample(samples, "multiple-sites")}
        filename={t("docs.guides.aws_integration.filename_app")}
      />

      <Callout type="warning">
        <p>
          <Trans k="docs.guides.aws_integration.warning_cleanup" />
        </p>
      </Callout>
    </>
  );
};

export default AwsIntegration;
