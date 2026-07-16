import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const fleetStatus = "tenant-fleet/src/components/fleet-status/index.tsx";

const Intro = () => (
  <>
    <h1>{t("docs.api.arrays.map_array.title")}</h1>
    <p class="docs-description">{t("docs.api.arrays.map_array.description")}</p>
  </>
);

const Reference = () => (
  <ApiReference
    name={t("docs.api.arrays.map_array.title")}
    signature={t("docs.api.arrays.map_array.signature")}
    parameters={[
      [
        <Trans
          k="docs.api.arrays.map_array.param_list_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.arrays.map_array.param_list_type"
          components={[Code]}
        />,
        <Trans k="docs.api.arrays.map_array.param_list_desc" />,
      ],
      [
        <Trans
          k="docs.api.arrays.map_array.param_map_fn_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.arrays.map_array.param_map_fn_type"
          components={[Code]}
        />,
        <Trans
          k="docs.api.arrays.map_array.param_map_fn_desc"
          components={[Code, Code]}
        />,
      ],
      [
        <Trans
          k="docs.api.arrays.map_array.param_options_name"
          components={[Code]}
        />,
        <Trans
          k="docs.api.arrays.map_array.param_options_type"
          components={[Code]}
        />,
        <Trans
          k="docs.api.arrays.map_array.param_options_desc"
          components={[Code]}
        />,
      ],
    ]}
  />
);

const OneLinePerTenant = () => (
  <>
    <DocHeading level={3} id="one-line-per-tenant">
      {t("docs.api.arrays.map_array.heading_one_line_per_tenant")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.arrays.map_array.usage_one_line_per_tenant"
        components={[Code, Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample(fleetStatus, "summary")}
      filename={t("docs.api.arrays.map_array.filename_fleet_status")}
    />
  </>
);

const InTheWild = () => (
  <p>
    <Trans
      k="docs.api.arrays.map_array.in_the_wild"
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

const MapArray: Component = () => {
  return (
    <>
      <Intro />
      <Reference />
      <DocHeading level={2} id="usage">
        {t("docs.ui.usage")}
      </DocHeading>
      <OneLinePerTenant />
      <InTheWild />
    </>
  );
};

export default MapArray;
