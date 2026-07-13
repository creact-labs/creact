import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const alert = "uptime-monitor/src/components/alert/index.tsx";

const CreateReaction: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_reaction.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_reaction.description")}
      </p>

      <ApiReference
        name={t("docs.api.reactive.create_reaction.title")}
        signature={t("docs.api.reactive.create_reaction.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.reactive.create_reaction.param_on_invalidate_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_reaction.param_on_invalidate_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_reaction.param_on_invalidate_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_reaction.param_options_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_reaction.param_options_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_reaction.param_options_desc"
              components={[Code]}
            />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.reactive.create_reaction.returns_body"
              components={[Code, Code]}
            />
          </p>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="alert-on-first-failure">
        {t("docs.api.reactive.create_reaction.heading_alert_on_first_failure")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.reactive.create_reaction.usage_alert_on_first_failure"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(alert, "first-failure")}
        filename={t("docs.api.reactive.create_reaction.filename_alert")}
      />

      <p>
        <Trans
          k="docs.api.reactive.create_reaction.in_the_wild"
          components={[
            (props) => (
              <TextLink href="#/docs/examples/uptime-monitor">
                {props.children}
              </TextLink>
            ),
          ]}
        />
      </p>
    </>
  );
};

export default CreateReaction;
