import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const writer = "page-writer/src/claude/html-writer/index.ts";
const page = "page-writer/src/components/page/index.tsx";

function IntroSection() {
  return (
    <>
      <h1>{t("docs.guides.ai_integration.title")}</h1>
      <p class="docs-description">
        {t("docs.guides.ai_integration.description")}
      </p>
    </>
  );
}

function ClientSection() {
  return (
    <>
      <DocHeading level={2} id="client">
        {t("docs.guides.ai_integration.heading_client")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.ai_integration.client_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(writer, "client")}
        filename={t("docs.guides.ai_integration.filename_writer")}
      />
      <p>
        <Trans
          k="docs.guides.ai_integration.client_notice"
          components={[Code]}
        />
      </p>
    </>
  );
}

function RequestSection() {
  return (
    <>
      <DocHeading level={2} id="request">
        {t("docs.guides.ai_integration.heading_request")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.ai_integration.request_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(writer, "request")}
        filename={t("docs.guides.ai_integration.filename_writer")}
      />
      <p>{t("docs.guides.ai_integration.request_notice")}</p>
    </>
  );
}

function ExtractSection() {
  return (
    <>
      <DocHeading level={2} id="extract">
        {t("docs.guides.ai_integration.heading_extract")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.ai_integration.extract_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(writer, "extract")}
        filename={t("docs.guides.ai_integration.filename_writer")}
      />
    </>
  );
}

function GenerateHandlerSection() {
  return (
    <>
      <DocHeading level={2} id="generate-handler">
        {t("docs.guides.ai_integration.heading_generate_handler")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.ai_integration.generate_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(page, "generate-handler")}
        filename={t("docs.guides.ai_integration.filename_page")}
      />
      <p>
        <Trans
          k="docs.guides.ai_integration.generate_notice"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function ClosingSection() {
  return (
    <>
      <Callout type="tip">
        <p>
          <Trans
            k="docs.guides.ai_integration.tip_persistence"
            components={[Code]}
          />
        </p>
      </Callout>
      <p>
        <Trans
          k="docs.guides.ai_integration.see_walkthrough"
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
}

const AiIntegration: Component = () => {
  return (
    <>
      <IntroSection />
      <ClientSection />
      <RequestSection />
      <ExtractSection />
      <GenerateHandlerSection />
      <ClosingSection />
    </>
  );
};

export default AiIntegration;
