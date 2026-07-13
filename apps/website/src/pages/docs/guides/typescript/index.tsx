import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const samples = "integrations/src/typescript.tsx";

const Typescript: Component = () => {
  return (
    <>
      <h1>{t("docs.guides.typescript.title")}</h1>
      <p class="docs-description">{t("docs.guides.typescript.description")}</p>

      <DocHeading level={2} id="tsconfig">
        {t("docs.guides.typescript.heading_tsconfig")}
      </DocHeading>
      <p>
        <Trans k="docs.guides.typescript.tsconfig_intro" />
      </p>
      <DocCodeBlock
        lang="json"
        code={t("docs.guides.typescript.code_tsconfig")}
        filename={t("docs.guides.typescript.filename_tsconfig")}
      />

      <DocHeading level={2} id="typed-signals">
        {t("docs.guides.typescript.heading_typed_signals")}
      </DocHeading>
      <p>{t("docs.guides.typescript.typed_signals_intro")}</p>
      <DocCodeBlock code={codeSample(samples, "typed-signals")} />

      <DocHeading level={2} id="typed-props">
        {t("docs.guides.typescript.heading_typed_props")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "typed-props")} />

      <DocHeading level={2} id="accessor-types">
        {t("docs.guides.typescript.heading_accessor_types")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "accessor-types")} />

      <Callout type="info">
        <p>
          <Trans k="docs.guides.typescript.info_types" />
        </p>
      </Callout>
    </>
  );
};

export default Typescript;
