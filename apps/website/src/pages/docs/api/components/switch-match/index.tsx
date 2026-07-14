import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import ApiSignature from "@/shared/components/api-signature";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import TextLink from "@/shared/components/text-link";

const Intro: Component = () => (
  <>
    <h1>{t("docs.api.components.switch_match.title")}</h1>
    <p class="docs-description">
      {t("docs.api.components.switch_match.description")}
    </p>

    <ApiReference
      name={t("docs.api.components.switch_match.name_switch")}
      signature={t("docs.api.components.switch_match.signature_switch")}
    />
    <ApiSignature
      name={t("docs.api.components.switch_match.name_match")}
      signature={t("docs.api.components.switch_match.signature_match")}
    />
  </>
);

const SwitchProps: Component = () => (
  <>
    <p>
      <strong>{t("docs.api.components.switch_match.name_switch")}</strong>
    </p>
    <DocTable
      headers={[
        t("docs.ui.prop_table.prop"),
        t("docs.ui.prop_table.type"),
        t("docs.ui.prop_table.description"),
      ]}
      rows={[
        [
          <Trans
            k="docs.api.components.switch_match.switch_prop_fallback_name"
            components={[Code]}
          />,
          <Trans
            k="docs.api.components.switch_match.switch_prop_fallback_type"
            components={[Code]}
          />,
          <Trans k="docs.api.components.switch_match.switch_prop_fallback_desc" />,
        ],
        [
          <Trans
            k="docs.api.components.switch_match.switch_prop_children_name"
            components={[Code]}
          />,
          <Trans
            k="docs.api.components.switch_match.switch_prop_children_type"
            components={[Code]}
          />,
          <Trans k="docs.api.components.switch_match.switch_prop_children_desc" />,
        ],
      ]}
    />
  </>
);

const MatchProps: Component = () => (
  <>
    <p>
      <strong>{t("docs.api.components.switch_match.name_match")}</strong>
    </p>
    <DocTable
      headers={[
        t("docs.ui.prop_table.prop"),
        t("docs.ui.prop_table.type"),
        t("docs.ui.prop_table.description"),
      ]}
      rows={[
        [
          <Trans
            k="docs.api.components.switch_match.match_prop_when_name"
            components={[Code]}
          />,
          <Trans
            k="docs.api.components.switch_match.match_prop_when_type"
            components={[Code]}
          />,
          <Trans k="docs.api.components.switch_match.match_prop_when_desc" />,
        ],
        [
          <Trans
            k="docs.api.components.switch_match.match_prop_children_name"
            components={[Code]}
          />,
          <Trans
            k="docs.api.components.switch_match.match_prop_children_type"
            components={[Code]}
          />,
          <Trans k="docs.api.components.switch_match.match_prop_children_desc" />,
        ],
      ]}
    />
  </>
);

const SeverityBranches: Component = () => (
  <>
    <DocHeading level={3} id="severity-branches">
      {t("docs.api.components.switch_match.heading_severity")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.components.switch_match.severity_intro"
        components={[Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample("uptime-monitor/src/app.tsx", "layout")}
      filename={t("docs.api.components.switch_match.filename_uptime_app")}
    />
  </>
);

const LifecycleStates: Component = () => (
  <>
    <DocHeading level={3} id="lifecycle-states">
      {t("docs.api.components.switch_match.heading_lifecycle")}
    </DocHeading>
    <p>
      <Trans
        k="docs.api.components.switch_match.lifecycle_intro"
        components={[Code, Code]}
      />
    </p>
    <DocCodeBlock
      code={codeSample("page-writer/src/components/page/index.tsx", "states")}
      filename={t("docs.api.components.switch_match.filename_page")}
    />
  </>
);

const InTheWild: Component = () => (
  <p>
    <Trans
      k="docs.api.components.switch_match.in_the_wild"
      components={[
        (props) => (
          <TextLink href="#/docs/examples/uptime-monitor">
            {props.children}
          </TextLink>
        ),
        (props) => (
          <TextLink href="#/docs/examples/page-writer">
            {props.children}
          </TextLink>
        ),
      ]}
    />
  </p>
);

const SwitchMatch: Component = () => {
  return (
    <>
      <Intro />

      <DocHeading level={3} id="props">
        {t("docs.api.components.switch_match.heading_props")}
      </DocHeading>
      <SwitchProps />
      <MatchProps />

      <DocHeading level={2} id="usage">
        {t("docs.api.components.switch_match.heading_usage")}
      </DocHeading>

      <SeverityBranches />
      <LifecycleStates />
      <InTheWild />
    </>
  );
};

export default SwitchMatch;
