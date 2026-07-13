import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const provider = "site-publisher/src/aws/provider/index.tsx";

const Children: Component = () => {
  return (
    <>
      <h1>{t("docs.api.props.children.title")}</h1>
      <p class="docs-description">{t("docs.api.props.children.description")}</p>

      <ApiReference
        name={t("docs.api.props.children.title")}
        signature={t("docs.api.props.children.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.props.children.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.props.children.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.props.children.param_fn_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.props.children.returns_desc"
              components={[Code, Code]}
            />
          </p>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="resolving-provider-children">
        {t("docs.api.props.children.heading_provider")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.props.children.usage_provider"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(provider, "provider")}
        filename={t("docs.api.props.children.filename_provider")}
      />

      <p>
        <Trans
          k="docs.api.props.children.in_the_wild"
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

export default Children;
