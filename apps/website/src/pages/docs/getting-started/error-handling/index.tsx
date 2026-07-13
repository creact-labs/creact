import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import Strong from "@/shared/components/strong";

const monitorApp = "uptime-monitor/src/app.tsx";
const statusPage = "uptime-monitor/src/components/status-page/index.tsx";
const page = "page-writer/src/components/page/index.tsx";

const ErrorHandling: Component = () => {
  return (
    <>
      <h1>{t("docs.getting_started.error_handling.title")}</h1>
      <p class="docs-description">
        {t("docs.getting_started.error_handling.description")}
      </p>

      <DocHeading level={2} id="error-boundary">
        {t("docs.getting_started.error_handling.heading_error_boundary")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.error_handling.error_boundary_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(monitorApp, "monitor-fault")}
        filename={t("docs.getting_started.error_handling.filename_monitor")}
      />

      <DocHeading level={2} id="catch-error">
        {t("docs.getting_started.error_handling.heading_catch_error")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.error_handling.catch_error_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(statusPage, "write-effect")}
        filename={t("docs.getting_started.error_handling.filename_status_page")}
      />

      <DocHeading level={2} id="handler-errors">
        {t("docs.getting_started.error_handling.heading_handler_errors")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.error_handling.handler_errors_intro"
          components={[Code, Strong, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(page, "generate-handler")}
        filename={t("docs.getting_started.error_handling.filename_page")}
      />

      <Callout type="warning">
        <p>
          <Trans
            k="docs.getting_started.error_handling.warning_cleanup"
            components={[Code]}
          />
        </p>
      </Callout>
    </>
  );
};

export default ErrorHandling;
