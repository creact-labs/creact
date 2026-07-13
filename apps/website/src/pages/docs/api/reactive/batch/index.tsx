import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const app = "uptime-monitor/src/app.tsx";

const Batch: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.batch.title")}</h1>
      <p class="docs-description">{t("docs.api.reactive.batch.description")}</p>

      <ApiReference
        name={t("docs.api.reactive.batch.title")}
        signature={t("docs.api.reactive.batch.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.reactive.batch.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.batch.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.batch.param_fn_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.reactive.batch.returns_body"
              components={[Code]}
            />
          </p>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="record-sample">
        {t("docs.api.reactive.batch.heading_record_sample")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.reactive.batch.usage_record_sample"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "sweep-state")}
        filename={t("docs.api.reactive.batch.filename_app")}
      />

      <p>
        <Trans
          k="docs.api.reactive.batch.in_the_wild"
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

export default Batch;
