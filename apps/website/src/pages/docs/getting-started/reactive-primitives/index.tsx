import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const app = "uptime-monitor/src/app.tsx";
const httpCheck = "uptime-monitor/src/components/http-check/index.tsx";

const ReactivePrimitives: Component = () => {
  return (
    <>
      <h1>{t("docs.getting_started.reactive_primitives.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.reactive_primitives.description")}
      </p>

      <DocHeading level={2} id="signals">
        {t("docs.getting_started.reactive_primitives.heading_signals")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.reactive_primitives.signals_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "sweep-state")}
        filename={t("docs.getting_started.reactive_primitives.filename_app")}
      />

      <Callout type="info">
        <p>
          <Trans
            k="docs.getting_started.reactive_primitives.info_batch"
            components={[Code]}
          />
        </p>
      </Callout>

      <DocHeading level={2} id="memos">
        {t("docs.getting_started.reactive_primitives.heading_memos")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.reactive_primitives.memos_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "derived-status")}
        filename={t("docs.getting_started.reactive_primitives.filename_app")}
      />

      <DocHeading level={2} id="computed">
        {t("docs.getting_started.reactive_primitives.heading_computed")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.reactive_primitives.computed_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "incidents")}
        filename={t("docs.getting_started.reactive_primitives.filename_app")}
      />

      <DocHeading level={2} id="on-untrack">
        {t("docs.getting_started.reactive_primitives.heading_on_untrack")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.reactive_primitives.on_untrack_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(httpCheck, "transitions")}
        filename={t(
          "docs.getting_started.reactive_primitives.filename_http_check",
        )}
      />
    </>
  );
};

export default ReactivePrimitives;
