import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const appFile = "site-publisher/src/app.tsx";
const manifestFile = "site-publisher/src/shared/manifest/index.ts";
const providerFile = "site-publisher/src/aws/provider/index.tsx";
const bucketFile = "site-publisher/src/aws/site-bucket/index.tsx";
const objectFile = "site-publisher/src/aws/site-object/index.tsx";
const entryFile = "site-publisher/index.tsx";

const SitePublisher: Component = () => {
  return (
    <>
      <h1>{t("docs.examples.site_publisher.title")}</h1>
      <p class="docs-description">
        {t("docs.examples.site_publisher.description")}
      </p>

      <DocHeading level={2} id="setup">
        {t("docs.examples.site_publisher.heading_setup")}
      </DocHeading>
      <p>{t("docs.examples.site_publisher.setup_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.site_publisher.code_copy_env")}
        filename={t("docs.examples.site_publisher.filename_terminal")}
      />
      <ul>
        <li>
          <Trans
            k="docs.examples.site_publisher.env_region"
            components={[Code, Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.site_publisher.env_access_key"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.site_publisher.env_secret_key"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.site_publisher.env_bucket"
            components={[Code]}
          />
        </li>
      </ul>

      <Callout type="warning">
        <p>{t("docs.examples.site_publisher.warning_real_aws")}</p>
        <p>
          <Trans
            k="docs.examples.site_publisher.warning_cleanup"
            components={[Code, Code]}
          />
        </p>
      </Callout>

      <DocHeading level={2} id="run-it">
        {t("docs.examples.site_publisher.heading_run")}
      </DocHeading>
      <p>{t("docs.examples.site_publisher.run_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.site_publisher.code_run")}
        filename={t("docs.examples.site_publisher.filename_terminal")}
      />
      <p>{t("docs.examples.site_publisher.run_expected")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.site_publisher.code_expected_output")}
        filename={t("docs.examples.site_publisher.filename_terminal")}
      />
      <p>{t("docs.examples.site_publisher.run_outro")}</p>

      <DocHeading level={2} id="failing-fast">
        {t("docs.examples.site_publisher.heading_failing_fast")}
      </DocHeading>
      <p>{t("docs.examples.site_publisher.failing_fast_intro")}</p>
      <DocCodeBlock
        code={codeSample(appFile, "require-env")}
        filename={t("docs.examples.site_publisher.filename_app")}
      />
      <p>{t("docs.examples.site_publisher.failing_fast_outro")}</p>

      <DocHeading level={2} id="the-manifest">
        {t("docs.examples.site_publisher.heading_manifest")}
      </DocHeading>
      <p>{t("docs.examples.site_publisher.manifest_shape_intro")}</p>
      <DocCodeBlock
        code={codeSample(manifestFile, "manifest-shape")}
        filename={t("docs.examples.site_publisher.filename_manifest")}
      />
      <p>{t("docs.examples.site_publisher.manifest_shape_outro")}</p>

      <p>{t("docs.examples.site_publisher.walk_intro")}</p>
      <DocCodeBlock
        code={codeSample(manifestFile, "walk")}
        filename={t("docs.examples.site_publisher.filename_manifest")}
      />
      <p>{t("docs.examples.site_publisher.walk_outro")}</p>

      <p>{t("docs.examples.site_publisher.hashing_intro")}</p>
      <DocCodeBlock
        code={codeSample(manifestFile, "hashing")}
        filename={t("docs.examples.site_publisher.filename_manifest")}
      />
      <p>{t("docs.examples.site_publisher.hashing_outro")}</p>

      <p>
        <Trans
          k="docs.examples.site_publisher.manifest_store_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(manifestFile, "manifest-store")}
        filename={t("docs.examples.site_publisher.filename_manifest")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.manifest_store_outro"
          components={[Code]}
        />
      </p>

      <p>{t("docs.examples.site_publisher.app_store_intro")}</p>
      <DocCodeBlock
        code={codeSample(appFile, "manifest-store")}
        filename={t("docs.examples.site_publisher.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.app_store_outro"
          components={[Code]}
        />
      </p>

      <DocHeading level={2} id="provider-boundary">
        {t("docs.examples.site_publisher.heading_provider")}
      </DocHeading>
      <p>{t("docs.examples.site_publisher.context_intro")}</p>
      <DocCodeBlock
        code={codeSample(providerFile, "context")}
        filename={t("docs.examples.site_publisher.filename_provider")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.context_outro"
          components={[Code]}
        />
      </p>

      <p>
        <Trans
          k="docs.examples.site_publisher.provider_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(providerFile, "provider")}
        filename={t("docs.examples.site_publisher.filename_provider")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.provider_outro"
          components={[Code, Code]}
        />
      </p>

      <p>{t("docs.examples.site_publisher.use_aws_intro")}</p>
      <DocCodeBlock
        code={codeSample(providerFile, "use-aws")}
        filename={t("docs.examples.site_publisher.filename_provider")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.use_aws_outro"
          components={[Code]}
        />
      </p>

      <DocHeading level={2} id="bucket-resource">
        {t("docs.examples.site_publisher.heading_bucket")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.site_publisher.defaults_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(bucketFile, "defaults")}
        filename={t("docs.examples.site_publisher.filename_bucket")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.defaults_outro"
          components={[Code, Code]}
        />
      </p>

      <p>
        <Trans
          k="docs.examples.site_publisher.ensure_bucket_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(bucketFile, "ensure-bucket")}
        filename={t("docs.examples.site_publisher.filename_bucket")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.ensure_bucket_outro"
          components={[Code]}
        />
      </p>

      <p>{t("docs.examples.site_publisher.public_access_intro")}</p>
      <DocCodeBlock
        code={codeSample(bucketFile, "public-access")}
        filename={t("docs.examples.site_publisher.filename_bucket")}
      />
      <p>{t("docs.examples.site_publisher.public_access_outro")}</p>

      <p>{t("docs.examples.site_publisher.policy_intro")}</p>
      <DocCodeBlock
        code={codeSample(bucketFile, "public-read-policy")}
        filename={t("docs.examples.site_publisher.filename_bucket")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.policy_outro"
          components={[Code]}
        />
      </p>

      <p>{t("docs.examples.site_publisher.website_config_intro")}</p>
      <DocCodeBlock
        code={codeSample(bucketFile, "website-config")}
        filename={t("docs.examples.site_publisher.filename_bucket")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.website_config_outro"
          components={[Code, Code]}
        />
      </p>

      <p>
        <Trans
          k="docs.examples.site_publisher.bucket_location_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(bucketFile, "bucket-location")}
        filename={t("docs.examples.site_publisher.filename_bucket")}
      />
      <p>{t("docs.examples.site_publisher.bucket_location_outro")}</p>

      <p>{t("docs.examples.site_publisher.site_url_intro")}</p>
      <DocCodeBlock
        code={codeSample(bucketFile, "site-url")}
        filename={t("docs.examples.site_publisher.filename_bucket")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.site_url_outro"
          components={[Code, Code]}
        />
      </p>

      <DocHeading level={2} id="uploading-objects">
        {t("docs.examples.site_publisher.heading_objects")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.site_publisher.object_props_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(objectFile, "object-props")}
        filename={t("docs.examples.site_publisher.filename_object")}
      />
      <p>{t("docs.examples.site_publisher.object_props_outro")}</p>

      <p>
        <Trans
          k="docs.examples.site_publisher.changed_check_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(objectFile, "changed-check")}
        filename={t("docs.examples.site_publisher.filename_object")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.changed_check_outro"
          components={[Code]}
        />
      </p>

      <p>{t("docs.examples.site_publisher.upload_intro")}</p>
      <DocCodeBlock
        code={codeSample(objectFile, "upload")}
        filename={t("docs.examples.site_publisher.filename_object")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.upload_outro"
          components={[Code]}
        />
      </p>

      <p>
        <Trans
          k="docs.examples.site_publisher.content_type_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(objectFile, "content-type")}
        filename={t("docs.examples.site_publisher.filename_object")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.content_type_outro"
          components={[Code]}
        />
      </p>

      <DocHeading level={2} id="the-tree">
        {t("docs.examples.site_publisher.heading_tree")}
      </DocHeading>
      <p>{t("docs.examples.site_publisher.tree_intro")}</p>
      <DocCodeBlock
        code={codeSample(appFile, "tree")}
        filename={t("docs.examples.site_publisher.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.tree_outro"
          components={[Code]}
        />
      </p>

      <p>{t("docs.examples.site_publisher.entry_intro")}</p>
      <DocCodeBlock
        code={codeSample(entryFile, "entry-point")}
        filename={t("docs.examples.site_publisher.filename_entry")}
      />
      <p>
        <Trans
          k="docs.examples.site_publisher.entry_outro"
          components={[Code]}
        />
      </p>

      <DocHeading level={2} id="checkpoint">
        {t("docs.examples.site_publisher.heading_checkpoint")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.site_publisher.checkpoint_second_run"
          components={[Code, Code]}
        />
      </p>
      <p>
        <Trans
          k="docs.examples.site_publisher.checkpoint_edit"
          components={[Code, Code]}
        />
      </p>

      <DocHeading level={2} id="recap">
        {t("docs.examples.site_publisher.heading_recap")}
      </DocHeading>
      <ul>
        <li>{t("docs.examples.site_publisher.recap_provider")}</li>
        <li>{t("docs.examples.site_publisher.recap_idempotent")}</li>
        <li>{t("docs.examples.site_publisher.recap_manifest")}</li>
        <li>
          <Trans
            k="docs.examples.site_publisher.recap_prev"
            components={[Code, Code]}
          />
        </li>
        <li>{t("docs.examples.site_publisher.recap_ordering")}</li>
      </ul>

      <DocHeading level={2} id="challenge">
        {t("docs.examples.site_publisher.heading_challenge")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.site_publisher.challenge"
          components={[Code, Code]}
        />
      </p>

      <DocHeading level={2} id="apis-used">
        {t("docs.examples.site_publisher.heading_apis")}
      </DocHeading>
      <ul>
        <li>
          <TextLink href="#/docs/api/context/create-context">
            {t("docs.examples.site_publisher.api_create_context")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/context/use-context">
            {t("docs.examples.site_publisher.api_use_context")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/store/create-store">
            {t("docs.examples.site_publisher.api_create_store")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/store/unwrap">
            {t("docs.examples.site_publisher.api_unwrap")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/components/for">
            {t("docs.examples.site_publisher.api_for")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/props/merge-props">
            {t("docs.examples.site_publisher.api_merge_props")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/props/split-props">
            {t("docs.examples.site_publisher.api_split_props")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/props/children">
            {t("docs.examples.site_publisher.api_children")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/props/access">
            {t("docs.examples.site_publisher.api_access")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/runtime/use-async-output">
            {t("docs.examples.site_publisher.api_use_async_output")}
          </TextLink>
        </li>
      </ul>
    </>
  );
};

export default SitePublisher;
