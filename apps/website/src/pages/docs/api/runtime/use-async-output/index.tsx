import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const counterApp = "durable-counter/src/app.tsx";
const page = "page-writer/src/components/page/index.tsx";
const siteObject = "site-publisher/src/aws/site-object/index.tsx";

const UseAsyncOutput: Component = () => {
  return (
    <>
      <h1>{t("docs.api.runtime.use_async_output.title")}</h1>
      <p class="docs-description">
        {t("docs.api.runtime.use_async_output.description")}
      </p>

      <DocCodeBlock
        code={codeSample(counterApp, "counter")}
        filename={t("docs.api.runtime.use_async_output.filename_counter")}
      />

      <ApiReference
        name={t("docs.api.runtime.use_async_output.title")}
        signature={t("docs.api.runtime.use_async_output.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.runtime.use_async_output.param_props_or_getter_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.use_async_output.param_props_or_getter_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.use_async_output.param_props_or_getter_desc" />,
          ],
          [
            <Trans
              k="docs.api.runtime.use_async_output.param_handler_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.use_async_output.param_handler_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.use_async_output.param_handler_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.runtime.use_async_output.returns_desc"
              components={[Code, Code]}
            />
          </p>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>

      <DocHeading level={3} id="counter">
        {t("docs.api.runtime.use_async_output.heading_counter")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.runtime.use_async_output.usage_counter"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(counterApp, "counter-handler")}
        filename={t("docs.api.runtime.use_async_output.filename_counter")}
      />

      <DocHeading level={3} id="restore">
        {t("docs.api.runtime.use_async_output.heading_restore")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.runtime.use_async_output.usage_restore"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(page, "generate-handler")}
        filename={t("docs.api.runtime.use_async_output.filename_page")}
      />

      <DocHeading level={3} id="prev-aware">
        {t("docs.api.runtime.use_async_output.heading_prev_aware")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.runtime.use_async_output.usage_prev_aware"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(siteObject, "changed-check")}
        filename={t("docs.api.runtime.use_async_output.filename_site_object")}
      />

      <Callout type="info">
        <p>
          <Trans k="docs.api.runtime.use_async_output.callout_idempotent" />
        </p>
      </Callout>

      <p>
        <Trans
          k="docs.api.runtime.use_async_output.in_the_wild"
          components={[
            (props) => (
              <TextLink href="#/docs/examples/durable-counter">
                {props.children}
              </TextLink>
            ),
          ]}
        />
      </p>
    </>
  );
};

export default UseAsyncOutput;
