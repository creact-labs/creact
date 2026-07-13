import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const counterEntry = "durable-counter/index.tsx";
const fleetEntry = "tenant-fleet/index.tsx";

const Render: Component = () => {
  return (
    <>
      <h1>{t("docs.api.runtime.render.title")}</h1>
      <p class="docs-description">
        {t("docs.api.runtime.render.description")}
      </p>

      <DocCodeBlock
        code={codeSample(counterEntry, "entry-point")}
        filename={t("docs.api.runtime.render.filename_counter")}
      />

      <ApiReference
        name={t("docs.api.runtime.render.title")}
        signature={t("docs.api.runtime.render.signature")}
        parameters={[
          [
            <Trans
              k="docs.api.runtime.render.param_fn_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.render.param_fn_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.render.param_fn_desc" />,
          ],
          [
            <Trans
              k="docs.api.runtime.render.param_memory_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.render.param_memory_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.render.param_memory_desc" />,
          ],
          [
            <Trans
              k="docs.api.runtime.render.param_stack_name_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.render.param_stack_name_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.render.param_stack_name_desc" />,
          ],
          [
            <Trans
              k="docs.api.runtime.render.param_options_name"
              components={[Code]}
            />,
            <Trans
              k="docs.api.runtime.render.param_options_type"
              components={[Code]}
            />,
            <Trans k="docs.api.runtime.render.param_options_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans
              k="docs.api.runtime.render.returns_desc"
              components={[Code, Code, Code]}
            />
          </p>
        }
      />

      <DocHeading level={2} id="awaiting-deployment">
        {t("docs.api.runtime.render.heading_awaiting")}
      </DocHeading>
      <p>
        <Trans
          k="docs.api.runtime.render.usage_awaiting"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(fleetEntry, "entry-point")}
        filename={t("docs.api.runtime.render.filename_fleet")}
      />

      <p>
        <Trans
          k="docs.api.runtime.render.in_the_wild"
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

export default Render;
