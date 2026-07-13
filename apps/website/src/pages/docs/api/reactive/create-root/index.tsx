import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const app = "page-writer/src/app.tsx";

const CreateRoot: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_root.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_root.description")}
      </p>

      <ApiReference
        name={t("docs.api.reactive.create_root.title")}
        signature={t("docs.api.reactive.create_root.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.reactive.create_root.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_root.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_root.param_fn_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_root.param_detached_owner_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_root.param_detached_owner_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_root.param_detached_owner_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.reactive.create_root.returns_body"
              components={[Code]}
            />
          </p>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.api.reactive.create_root.heading_usage")}
      </DocHeading>

      <DocHeading level={3} id="self-disposing-scope">
        {t("docs.api.reactive.create_root.heading_self_disposing_scope")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.reactive.create_root.usage_self_disposing_scope"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "settled-watch")}
        filename={t("docs.api.reactive.create_root.filename_app")}
      />

      <Callout type="info">
        <p>
          <Trans
            k="docs.api.reactive.create_root.info_render_root"
            components={[Code, Code, Code]}
          />
        </p>
      </Callout>

      <p>
        <Trans
          k="docs.api.reactive.create_root.in_the_wild"
          components={[
            (props) => (
              <TextLink href="#/docs/examples/page-writer">
                {props.children}
              </TextLink>
            ),
          ]}
        />
      </p>
    </>
  );
};

export default CreateRoot;
