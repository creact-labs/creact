import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import Strong from "@/shared/components/strong";

const samples = "durable-counter/src/error-handling.tsx";

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
          components={[Code]}
        />
      </p>
      <DocCodeBlock code={codeSample(samples, "error-boundary")} />

      <DocHeading level={2} id="catch-error">
        {t("docs.getting_started.error_handling.heading_catch_error")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.error_handling.catch_error_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock code={codeSample(samples, "catch-error")} />

      <DocHeading level={2} id="error-propagation">
        {t("docs.getting_started.error_handling.heading_error_propagation")}
      </DocHeading>
      <p>{t("docs.getting_started.error_handling.error_propagation_body")}</p>

      <DocHeading level={2} id="handler-errors">
        {t("docs.getting_started.error_handling.heading_handler_errors")}
      </DocHeading>
      <p>
        <Trans
          k="docs.getting_started.error_handling.handler_errors_intro"
          components={[Code, Strong, Code]}
        />
      </p>
      <DocCodeBlock code={codeSample(samples, "handler-errors")} />

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
