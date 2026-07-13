import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const siteObject = "site-publisher/src/aws/site-object/index.tsx";

const Access: Component = () => {
  return (
    <>
      <h1>{t("docs.api.props.access.title")}</h1>
      <p class="docs-description">{t("docs.api.props.access.description")}</p>

      <ApiReference
        name={t("docs.api.props.access.title")}
        signature={t("docs.api.props.access.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.props.access.param_value_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.props.access.param_value_type"
              components={[Code]}
            />,
            <Trans k="docs.api.props.access.param_value_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.props.access.returns_desc"
              components={[Code]}
            />
          </p>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="unwrapping-props">
        {t("docs.api.props.access.heading_unwrapping")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.props.access.usage_unwrapping"
          components={[Code, Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(siteObject, "object-props")}
        filename={t("docs.api.props.access.filename_site_object")}
      />

      <p>
        <Trans
          k="docs.api.props.access.in_the_wild"
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

export default Access;
