import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const samples = "page-writer/src/components/http-channel/index.tsx";

const HttpApis: Component = () => {
  return (
    <>
      <h1>{t("docs.guides.http_apis.title")}</h1>
      <p class="docs-description">{t("docs.guides.http_apis.description")}</p>

      <DocHeading level={2} id="channels">
        {t("docs.guides.http_apis.heading_channels")}
      </DocHeading>
      <p>{t("docs.guides.http_apis.channels_desc")}</p>

      <DocHeading level={2} id="server-resource">
        {t("docs.guides.http_apis.heading_server_resource")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.http_apis.server_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "server")}
        filename={t("docs.guides.http_apis.filename_channel")}
      />
      <p>
        <Trans
          k="docs.guides.http_apis.server_notice"
          components={[Code, Code]}
        />
      </p>

      <DocHeading level={2} id="routes">
        {t("docs.guides.http_apis.heading_routes")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.http_apis.routes_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "routes")}
        filename={t("docs.guides.http_apis.filename_channel")}
      />
      <p>
        <Trans
          k="docs.guides.http_apis.routes_notice"
          components={[Code]}
        />
      </p>

      <DocHeading level={2} id="teardown">
        {t("docs.guides.http_apis.heading_teardown")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.http_apis.teardown_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "teardown")}
        filename={t("docs.guides.http_apis.filename_channel")}
      />

      <Callout type="info">
        <p>
          <Trans k="docs.guides.http_apis.info_cleanup" components={[Code]} />
        </p>
      </Callout>
      <p>
        <Trans
          k="docs.guides.http_apis.see_walkthrough"
          components={[
            (props) => (
              <TextLink href="#/docs/examples/page-writer">
                {props.children}
              </TextLink>
            ),
          ]}
        />
      </p>
    </>
  );
};

export default HttpApis;
