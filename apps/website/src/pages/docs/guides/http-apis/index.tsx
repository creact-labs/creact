import type { Component } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import RichText from "@/shared/components/rich-text";

const samples = "guides-tour/src/http-apis.tsx";

const HttpApis: Component = () => {
  return (
    <>
      <h1>{t("docs.guides.http_apis.title")}</h1>
      <p class="docs-description">{t("docs.guides.http_apis.description")}</p>

      <DocHeading level={2} id="channels">
        {t("docs.guides.http_apis.heading_channels")}
      </DocHeading>
      <p>{t("docs.guides.http_apis.channels_desc")}</p>

      <DocHeading level={2} id="http-server">
        {t("docs.guides.http_apis.heading_http_server")}
      </DocHeading>
      <p>
        <RichText k="docs.guides.http_apis.http_server_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "channel")}
        filename={t("docs.guides.http_apis.filename_channel")}
      />

      <DocHeading level={2} id="reactive-flow">
        {t("docs.guides.http_apis.heading_reactive_flow")}
      </DocHeading>
      <p>
        <RichText k="docs.guides.http_apis.reactive_flow_intro" />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "reactive-flow")}
        filename={t("docs.guides.http_apis.filename_app")}
      />

      <Callout type="info">
        <p>
          <RichText k="docs.guides.http_apis.info_cleanup" />
        </p>
      </Callout>
    </>
  );
};

export default HttpApis;
