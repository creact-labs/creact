import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const samples = "api-cookbook/src/reactive/create-root.ts";

const CreateRoot: Component = () => {
  return (
    <>
      <h1>{t("docs.api.reactive.create_root.title")}</h1>
      <p class="docs-description">
        {t("docs.api.reactive.create_root.description")}
      </p>

      <ApiReference
        name={t("docs.api.reactive.create_root.title")}
        signature={t("docs.api.reactive.create_root.signature")}
        parameters={[
          [
            <Trans k="docs.api.reactive.create_root.param_fn_name" />,
            <Trans k="docs.api.reactive.create_root.param_fn_type" />,
            <Trans k="docs.api.reactive.create_root.param_fn_desc" />,
          ],
          [
            <Trans k="docs.api.reactive.create_root.param_detached_owner_name" />,
            <Trans k="docs.api.reactive.create_root.param_detached_owner_type" />,
            <Trans k="docs.api.reactive.create_root.param_detached_owner_desc" />,
          ],
        ]}
        returns={
          <p>
            <Trans k="docs.api.reactive.create_root.returns_body" />
          </p>
        }
      />

      <DocHeading level={2} id="usage">
        {t("docs.api.reactive.create_root.heading_usage")}
      </DocHeading>

      <DocHeading level={3} id="basic">
        {t("docs.api.reactive.create_root.heading_basic")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "basic")} />

      <DocHeading level={3} id="testing">
        {t("docs.api.reactive.create_root.heading_testing")}
      </DocHeading>
      <DocCodeBlock code={codeSample(samples, "testing")} />

      <Callout type="info">
        <p>
          <Trans k="docs.api.reactive.create_root.info_render_root" />
        </p>
      </Callout>
    </>
  );
};

export default CreateRoot;
