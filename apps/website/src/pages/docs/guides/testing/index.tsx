import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const samples = "integrations/src/testing.tsx";

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

      <DocHeading level={2} id="testing-signals">
        {t("docs.guides.testing.heading_testing_signals")}
      </DocHeading>
      <p>
        <Trans k="docs.guides.testing.testing_signals_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "testing-signals")}
        filename={t("docs.guides.testing.filename_signals_spec")}
      />

      <DocHeading level={2} id="testing-components">
        {t("docs.guides.testing.heading_testing_components")}
      </DocHeading>
      <p>{t("docs.guides.testing.testing_components_intro")}</p>
      <DocCodeBlock
        code={codeSample(samples, "testing-components")}
        filename={t("docs.guides.testing.filename_counter_spec")}
      />

      <DocHeading level={2} id="testing-flow">
        {t("docs.guides.testing.heading_testing_flow")}
      </DocHeading>
      <DocCodeBlock
        code={codeSample(samples, "testing-flow")}
        filename={t("docs.guides.testing.filename_flow_spec")}
      />

      <Callout type="tip">
        <p>
          <Trans k="docs.guides.testing.tip_create_root" />
        </p>
      </Callout>
    </>
  );
};

export default Testing;
