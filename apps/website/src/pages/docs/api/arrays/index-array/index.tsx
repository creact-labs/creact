import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const app = "tenant-fleet/src/app.tsx";

const Intro = () => (
  <>
    <h1>{t("docs.api.arrays.index_array.title")}</h1>
    <p class="docs-description">
      {t("docs.api.arrays.index_array.description")}
    </p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.arrays.index_array.title")}
    signature={t("docs.api.arrays.index_array.signature")}
    parameters={[
      [
        <Trans
          k="docs.api.arrays.index_array.param_list_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.arrays.index_array.param_list_type"
          components={[Code]}
        />,
        <Trans k="docs.api.arrays.index_array.param_list_desc" />,
      ],
      [
        <Trans
          k="docs.api.arrays.index_array.param_map_fn_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.arrays.index_array.param_map_fn_type"
          components={[Code]}
        />,
        <Trans
          k="docs.api.arrays.index_array.param_map_fn_desc"
          components={[Code, Code]}
        />,
      ],
    ]}
  />
);

const NumberedRoster = () => (
  <>
    <DocHeading level={3} id="numbered-roster">
      {t("docs.api.arrays.index_array.heading_numbered_roster")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.arrays.index_array.usage_numbered_roster"
        components={[Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(app, "fleet")}
      filename={t("docs.api.arrays.index_array.filename_app")}
    />
  </>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.arrays.index_array.in_the_wild"
      components={[
        (props) => (
          <TextLink href="#/docs/examples/tenant-fleet">
            {props.children}
          </TextLink>
        ),
      ]}
    />
  </p>
);

const IndexArray: Component = () => {
  return (
    <>
      <Intro />
      <Reference />
      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>
      <NumberedRoster />
      <InTheWild />
    </>
  );
};

export default IndexArray;
