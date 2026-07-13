import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const page = "page-writer/src/components/page/index.tsx";

const CreateRenderEffect: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_render_effect.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_render_effect.description")}
      </p>

      <ApiReference
        name={t("docs.api.reactive.create_render_effect.title")}
        signature={t("docs.api.reactive.create_render_effect.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.reactive.create_render_effect.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_render_effect.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_render_effect.param_fn_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_render_effect.param_value_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_render_effect.param_value_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_render_effect.param_value_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_render_effect.param_options_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_render_effect.param_options_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_render_effect.param_options_desc"
              components={[Code]}
            />,
          ],
        ]}
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="reporting-state">
        {t("docs.api.reactive.create_render_effect.heading_reporting_state")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.reactive.create_render_effect.usage_reporting_state"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(page, "states")}
        filename={t("docs.api.reactive.create_render_effect.filename_page")}
      />

      <Callout type="info">
        <p>
          <Trans
            k="docs.api.reactive.create_render_effect.info_ordering"
            components={[Code]}
          />
        </p>
      </Callout>

      <p>
        <Trans
          k="docs.api.reactive.create_render_effect.in_the_wild"
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

export default CreateRenderEffect;
