import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const manifest = "site-publisher/src/shared/manifest/index.ts";

const CreateStore: Component = () => {
  return (
    <>
      <h1>{t("docs.api.store.create_store.title")}</h1>
      <p class="docs-description">
        {t("docs.api.store.create_store.description")}
      </p>

      <ApiReference
        name={t("docs.api.store.create_store.title")}
        signature={t("docs.api.store.create_store.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.store.create_store.param_value_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.store.create_store.param_value_type"
              components={[Code]}
            />,
            <Trans k="docs.api.store.create_store.param_value_desc" />,
          ],
        ]}
        returns={
          <>
            <p>
              <Trans
                k="docs.api.store.create_store.returns_intro"
                components={[Code]}
              />
            </p>
            <ul>
              <li>
                <Trans
                  k="docs.api.store.create_store.returns_store"
                  components={[Code]}
                />
              </li>
              <li>
                <Trans
                  k="docs.api.store.create_store.returns_setstore"
                  components={[Code]}
                />
              </li>
            </ul>
          </>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="the-manifest-shape">
        {t("docs.api.store.create_store.heading_the_manifest_shape")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.store.create_store.usage_the_manifest_shape"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(manifest, "manifest-shape")}
        filename={t("docs.api.store.create_store.filename_manifest")}
      />

      <DocHeading level={3} id="a-reactive-manifest">
        {t("docs.api.store.create_store.heading_a_reactive_manifest")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.store.create_store.usage_a_reactive_manifest"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(manifest, "manifest-store")}
        filename={t("docs.api.store.create_store.filename_manifest")}
      />

      <p>
        <Trans
          k="docs.api.store.create_store.in_the_wild"
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

export default CreateStore;
