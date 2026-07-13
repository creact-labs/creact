import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const provider = "site-publisher/src/aws/provider/index.tsx";

const Intro = () => (
  <>
    <h1>{t("docs.api.context.use_context.title")}</h1>
    <p class="docs-description">
      {t("docs.api.context.use_context.description")}
    </p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.context.use_context.title")}
    signature={t("docs.api.context.use_context.signature")}
    parameters={[
      [
        <Trans
          k="docs.api.context.use_context.param_context_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.context.use_context.param_context_type"
          components={[Code]}
        />,
        <Trans
          k="docs.api.context.use_context.param_context_desc"
          components={[Code]}
        />,
      ],
    ]}
    returns={
      <p>
        <Trans
          k="docs.api.context.use_context.returns_desc"
          components={[Code, Code]}
        />
      </p>
    }
  />
);

const ContextShape = () => (
  <>
    <DocHeading level={3} id="the-context-shape">
      {t("docs.api.context.use_context.heading_the_context_shape")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.context.use_context.usage_the_context_shape"
        components={[Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(provider, "context")}
      filename={t("docs.api.context.use_context.filename_provider")}
    />
  </>
);

const ReadingTheConnection = () => (
  <>
    <DocHeading level={3} id="reading-the-connection">
      {t("docs.api.context.use_context.heading_reading_the_connection")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.context.use_context.usage_reading_the_connection"
        components={[Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(provider, "use-aws")}
      filename={t("docs.api.context.use_context.filename_provider")}
    />
  </>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.context.use_context.in_the_wild"
      components={[
        (props) => (
          <TextLink href="#/docs/examples/site-publisher">
            {props.children}
          </TextLink>
        ),
      ]}
    />
  </p>
);

const UseContext: Component = () => {
  return (
    <>
      <Intro />
      <Reference />
      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>
      <ContextShape />
      <ReadingTheConnection />
      <InTheWild />
    </>
  );
};

export default UseContext;
