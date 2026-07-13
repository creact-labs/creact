import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const siteObject = "site-publisher/src/aws/site-object/index.tsx";
const tenantApp = "tenant-fleet/src/components/tenant-app/index.tsx";

const Typescript: Component = () => {
  return (
    <>
      <h1>{t("docs.guides.typescript.title")}</h1>
      <p class="docs-description">{t("docs.guides.typescript.description")}</p>

      <DocHeading level={2} id="tsconfig">
        {t("docs.guides.typescript.heading_tsconfig")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.typescript.tsconfig_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        lang="json"
        code={t("docs.guides.typescript.code_tsconfig")}
        filename={t("docs.guides.typescript.filename_tsconfig")}
      />

      <DocHeading level={2} id="value-or-accessor-props">
        {t("docs.guides.typescript.heading_value_or_accessor")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.typescript.value_or_accessor_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(siteObject, "object-props")}
        filename={t("docs.guides.typescript.filename_site_object")}
      />

      <DocHeading level={2} id="typed-defaults">
        {t("docs.guides.typescript.heading_typed_defaults")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.typescript.typed_defaults_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(tenantApp, "tree")}
        filename={t("docs.guides.typescript.filename_tenant_app")}
      />

      <Callout type="info">
        <p>
          <Trans
            k="docs.guides.typescript.info_types"
            components={[Code, Code, Code, Code, Code, Code, Code]}
          />
        </p>
      </Callout>

      <p>
        <Trans
          k="docs.guides.typescript.in_the_wild"
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

export default Typescript;
