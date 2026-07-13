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

const parameters = [
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
];

const Intro = () => (
  <>
    <h1>{t("docs.api.reactive.create_root.title")}</h1>
    <p class="docs-description">
      {t("docs.api.reactive.create_root.description")}
    </p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.reactive.create_root.title")}
    signature={t("docs.api.reactive.create_root.signature")}
    parameters={parameters}
    returns={
      <p>
        <Trans
          k="docs.api.reactive.create_root.returns_body"
          components={[Code]}
        />
      </p>
    }
  />
);

const SelfDisposingScope = () => (
  <>
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
  </>
);

const Info = () => (
  <Callout type="info">
    <p>
      <Trans
        k="docs.api.reactive.create_root.info_render_root"
        components={[Code, Code, Code]}
      />
    </p>
  </Callout>
);

const InTheWild = () => (
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
);

const Usage = () => (
  <>
    <DocHeading level={2} id="usage">
      {t("docs.api.reactive.create_root.heading_usage")}
    </DocHeading>
    <SelfDisposingScope />
    <Info />
    <InTheWild />
  </>
);

const CreateRoot: Component = () => (
  <>
    <Intro />
    <Reference />
    <Usage />
  </>
);

export default CreateRoot;
