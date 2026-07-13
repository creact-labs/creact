import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const provider = "site-publisher/src/aws/provider/index.tsx";

const CreateContext: Component = () => {
  return (
    <>
      <h1>{t("docs.api.context.create_context.title")}</h1>
      <p class="docs-description">
        {t("docs.api.context.create_context.description")}
      </p>

      <ApiReference
        name={t("docs.api.context.create_context.title")}
        signature={t("docs.api.context.create_context.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.context.create_context.param_default_value_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.context.create_context.param_default_value_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.context.create_context.param_default_value_desc"
              components={[Code]}
            />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.context.create_context.returns_desc"
              components={[Code, Code]}
            />
          </p>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="declaring-the-context">
        {t("docs.api.context.create_context.heading_declaring_the_context")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.context.create_context.usage_declaring_the_context"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(provider, "context")}
        filename={t("docs.api.context.create_context.filename_provider")}
      />

      <DocHeading level={3} id="providing-a-value">
        {t("docs.api.context.create_context.heading_providing_a_value")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.context.create_context.usage_providing_a_value"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(provider, "provider")}
        filename={t("docs.api.context.create_context.filename_provider")}
      />

      <p>
        <Trans
          k="docs.api.context.create_context.in_the_wild"
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

export default CreateContext;
