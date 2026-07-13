import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const app = "uptime-monitor/src/app.tsx";
const statusPage = "uptime-monitor/src/components/status-page/index.tsx";

const CreateMemo: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_memo.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_memo.description")}
      </p>

      <ApiReference
        name={t("docs.api.reactive.create_memo.title")}
        signature={t("docs.api.reactive.create_memo.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.reactive.create_memo.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_memo.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_memo.param_fn_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_memo.param_value_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_memo.param_value_type"
              components={[Code]}
            />,
            <Trans k="docs.api.reactive.create_memo.param_value_desc" />,
          ],
          [
            <Trans
              k="docs.api.reactive.create_memo.param_options_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_memo.param_options_type"
              components={[Code]}
            />,
            <Trans
              k="docs.api.reactive.create_memo.param_options_desc"
              components={[Code]}
            />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.reactive.create_memo.returns_body"
              components={[Code]}
            />
          </p>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="chained-status">
        {t("docs.api.reactive.create_memo.heading_chained_status")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.reactive.create_memo.usage_chained_status"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "derived-status")}
        filename={t("docs.api.reactive.create_memo.filename_app")}
      />

      <DocHeading level={3} id="table-rows">
        {t("docs.api.reactive.create_memo.heading_table_rows")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.reactive.create_memo.usage_table_rows"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(statusPage, "uptime-rows")}
        filename={t("docs.api.reactive.create_memo.filename_status_page")}
      />

      <p>
        <Trans
          k="docs.api.reactive.create_memo.in_the_wild"
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

export default CreateMemo;
