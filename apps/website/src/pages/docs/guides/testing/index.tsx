import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const counterTest = "durable-counter/src/__tests__/app.test.tsx";
const httpCheckTest =
  "uptime-monitor/src/components/http-check/__tests__/http-check.test.tsx";

const Testing: Component = () => {
  return (
    <>
      <h1>{t("docs.guides.testing.title")}</h1>
      <p class="docs-description">{t("docs.guides.testing.description")}</p>

      <DocHeading level={2} id="setup">
        {t("docs.guides.testing.heading_setup")}
      </DocHeading>
      <p>{t("docs.guides.testing.setup_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.guides.testing.code_install")}
        filename={t("docs.guides.testing.filename_terminal")}
      />

      <DocHeading level={2} id="rendering">
        {t("docs.guides.testing.heading_rendering")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.testing.rendering_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <p>
        <Trans
          k="docs.guides.testing.rendering_outputs"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(counterTest, "render-test")}
        filename={t("docs.guides.testing.filename_counter_test")}
      />

      <Callout type="tip">
        <p>
          <Trans
            k="docs.guides.testing.tip_reset_runtime"
            components={[Code, Code]}
          />
        </p>
      </Callout>

      <DocHeading level={2} id="mocking">
        {t("docs.guides.testing.heading_mocking")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.testing.mocking_intro"
          components={[Code, Code]}
        />
      </p>
      <p>
        <Trans
          k="docs.guides.testing.mocking_transitions"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(httpCheckTest, "mock-fetch-test")}
        filename={t("docs.guides.testing.filename_http_check_test")}
      />

      <p>
        <Trans
          k="docs.guides.testing.in_the_wild"
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

export default Testing;
