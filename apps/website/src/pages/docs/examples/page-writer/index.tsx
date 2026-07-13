import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";
import LiveExample from "@/shared/playground/live-example";

const entry = "page-writer/index.tsx";
const app = "page-writer/src/app.tsx";
const httpChannel = "page-writer/src/components/http-channel/index.tsx";
const page = "page-writer/src/components/page/index.tsx";
const htmlWriter = "page-writer/src/claude/html-writer/index.ts";

function Intro() {
  return (
    <>
      <h1>{t("docs.examples.page_writer.title")}</h1>
      <p class="docs-description">
        {t("docs.examples.page_writer.description")}
      </p>
    </>
  );
}

function Setup() {
  return (
    <>
      <DocHeading level={2} id="setup">
        {t("docs.examples.page_writer.heading_setup")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.page_writer.setup_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.page_writer.code_setup")}
        filename={t("docs.examples.page_writer.filename_terminal")}
      />
    </>
  );
}

function RunItInvoke() {
  return (
    <>
      <DocHeading level={2} id="run-it">
        {t("docs.examples.page_writer.heading_run")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.page_writer.run_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.page_writer.code_run")}
        filename={t("docs.examples.page_writer.filename_terminal")}
      />
      <LiveExample app="page-writer" />
      <p>{t("docs.examples.page_writer.run_create_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.page_writer.code_curl_create")}
        filename={t("docs.examples.page_writer.filename_terminal")}
      />
      <p>{t("docs.examples.page_writer.run_create_outro")}</p>
      <DocCodeBlock
        lang="json"
        code={t("docs.examples.page_writer.code_curl_create_response")}
        filename={t("docs.examples.page_writer.filename_response")}
      />
    </>
  );
}

function RunItList() {
  return (
    <>
      <p>{t("docs.examples.page_writer.run_list_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.page_writer.code_curl_list")}
        filename={t("docs.examples.page_writer.filename_terminal")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.run_list_outro"
          components={[Code, Code, Code, Code, Code, Code, Code]}
        />
      </p>
    </>
  );
}

function TreeAtAGlance() {
  return (
    <>
      <DocHeading level={2} id="tree-at-a-glance">
        {t("docs.examples.page_writer.heading_tree")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.page_writer.tree_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(app, "hero")}
        filename={t("docs.examples.page_writer.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.tree_outro"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function FailFast() {
  return (
    <>
      <DocHeading level={2} id="fail-fast">
        {t("docs.examples.page_writer.heading_fail_fast")}
      </DocHeading>
      <p>{t("docs.examples.page_writer.fail_fast_intro")}</p>
      <DocCodeBlock
        code={codeSample(entry, "entry-point")}
        filename={t("docs.examples.page_writer.filename_entry")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.fail_fast_outro"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function RequestLedger() {
  return (
    <>
      <DocHeading level={2} id="request-ledger">
        {t("docs.examples.page_writer.heading_ledger")}
      </DocHeading>
      <p>{t("docs.examples.page_writer.ledger_intro")}</p>
      <DocCodeBlock
        code={codeSample(app, "requests-store")}
        filename={t("docs.examples.page_writer.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.ledger_outro"
          components={[Code, Code, Code, Code, Code]}
        />
      </p>
    </>
  );
}

function WiringTheFleet() {
  return (
    <>
      <DocHeading level={2} id="wiring-the-fleet">
        {t("docs.examples.page_writer.heading_wiring")}
      </DocHeading>
      <p>{t("docs.examples.page_writer.wiring_intro")}</p>
      <DocCodeBlock
        code={codeSample(app, "wiring")}
        filename={t("docs.examples.page_writer.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.wiring_outro"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function HttpChannel() {
  return (
    <>
      <DocHeading level={2} id="http-channel">
        {t("docs.examples.page_writer.heading_http")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.page_writer.http_server_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(httpChannel, "server")}
        filename={t("docs.examples.page_writer.filename_http_channel")}
      />
      <p>{t("docs.examples.page_writer.http_server_outro")}</p>
      <p>{t("docs.examples.page_writer.http_routes_intro")}</p>
      <DocCodeBlock
        code={codeSample(httpChannel, "routes")}
        filename={t("docs.examples.page_writer.filename_http_channel")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.http_routes_outro"
          components={[Code, Code]}
        />
      </p>
      <p>{t("docs.examples.page_writer.http_teardown_intro")}</p>
      <DocCodeBlock
        code={codeSample(httpChannel, "teardown")}
        filename={t("docs.examples.page_writer.filename_http_channel")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.http_teardown_outro"
          components={[Code]}
        />
      </p>
    </>
  );
}

function PageLifecycle() {
  return (
    <>
      <DocHeading level={2} id="page-lifecycle">
        {t("docs.examples.page_writer.heading_lifecycle")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.page_writer.lifecycle_states_intro"
          components={[Code, Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(page, "states")}
        filename={t("docs.examples.page_writer.filename_page")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.lifecycle_states_outro"
          components={[Code, Code]}
        />
      </p>
      <p>{t("docs.examples.page_writer.lifecycle_handler_intro")}</p>
      <DocCodeBlock
        code={codeSample(page, "generate-handler")}
        filename={t("docs.examples.page_writer.filename_page")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.lifecycle_handler_outro"
          components={[Code, Code, Code]}
        />
      </p>
      <p>{t("docs.examples.page_writer.lifecycle_write_intro")}</p>
      <DocCodeBlock
        code={codeSample(page, "deploy-write")}
        filename={t("docs.examples.page_writer.filename_page")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.lifecycle_write_outro"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function TalkingToClaude() {
  return (
    <>
      <DocHeading level={2} id="talking-to-claude">
        {t("docs.examples.page_writer.heading_claude")}
      </DocHeading>
      <p>{t("docs.examples.page_writer.claude_client_intro")}</p>
      <DocCodeBlock
        lang="ts"
        code={codeSample(htmlWriter, "client")}
        filename={t("docs.examples.page_writer.filename_html_writer")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.claude_client_outro"
          components={[Code]}
        />
      </p>
      <p>{t("docs.examples.page_writer.claude_request_intro")}</p>
      <DocCodeBlock
        lang="ts"
        code={codeSample(htmlWriter, "request")}
        filename={t("docs.examples.page_writer.filename_html_writer")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.claude_request_outro"
          components={[Code]}
        />
      </p>
      <p>{t("docs.examples.page_writer.claude_extract_intro")}</p>
      <DocCodeBlock
        lang="ts"
        code={codeSample(htmlWriter, "extract")}
        filename={t("docs.examples.page_writer.filename_html_writer")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.claude_extract_outro"
          components={[Code, Code, Code]}
        />
      </p>
    </>
  );
}

function WatchingItSettle() {
  return (
    <>
      <DocHeading level={2} id="watching-it-settle">
        {t("docs.examples.page_writer.heading_settle")}
      </DocHeading>
      <p>{t("docs.examples.page_writer.settle_intro")}</p>
      <DocCodeBlock
        code={codeSample(app, "settled-watch")}
        filename={t("docs.examples.page_writer.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.page_writer.settle_outro"
          components={[Code, Code, Code, Code]}
        />
      </p>
    </>
  );
}

function Checkpoint() {
  return (
    <>
      <DocHeading level={2} id="checkpoint">
        {t("docs.examples.page_writer.heading_checkpoint")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.page_writer.checkpoint_dedupe"
          components={[Code]}
        />
      </p>
      <p>
        <Trans
          k="docs.examples.page_writer.checkpoint_restart"
          components={[Code, Code, Code, Code]}
        />
      </p>
    </>
  );
}

function Recap() {
  return (
    <>
      <DocHeading level={2} id="recap">
        {t("docs.examples.page_writer.heading_recap")}
      </DocHeading>
      <ul>
        <li>{t("docs.examples.page_writer.recap_ledger")}</li>
        <li>
          <Trans
            k="docs.examples.page_writer.recap_fleet"
            components={[Code, Code]}
          />
        </li>
        <li>{t("docs.examples.page_writer.recap_server")}</li>
        <li>{t("docs.examples.page_writer.recap_restore")}</li>
        <li>
          <Trans
            k="docs.examples.page_writer.recap_owner"
            components={[Code, Code, Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.page_writer.recap_root"
            components={[Code]}
          />
        </li>
      </ul>
    </>
  );
}

function Challenge() {
  return (
    <>
      <DocHeading level={2} id="challenge">
        {t("docs.examples.page_writer.heading_challenge")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.page_writer.challenge_body"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function ApisUsed() {
  return (
    <>
      <DocHeading level={2} id="apis-used">
        {t("docs.examples.page_writer.heading_apis")}
      </DocHeading>
      <ul>
        <li>
          <TextLink href="#/docs/api/runtime/use-async-output">
            {t("docs.examples.page_writer.api_use_async_output")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/components/for">
            {t("docs.examples.page_writer.api_for")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/components/switch-match">
            {t("docs.examples.page_writer.api_switch_match")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/create-render-effect">
            {t("docs.examples.page_writer.api_create_render_effect")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/create-selector">
            {t("docs.examples.page_writer.api_create_selector")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/create-root">
            {t("docs.examples.page_writer.api_create_root")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/owner/get-owner">
            {t("docs.examples.page_writer.api_get_owner")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/owner/run-with-owner">
            {t("docs.examples.page_writer.api_run_with_owner")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/lifecycle/on-cleanup">
            {t("docs.examples.page_writer.api_on_cleanup")}
          </TextLink>
        </li>
      </ul>
    </>
  );
}

const PageWriter: Component = () => {
  return (
    <>
      <Intro />
      <Setup />
      <RunItInvoke />
      <RunItList />
      <TreeAtAGlance />
      <FailFast />
      <RequestLedger />
      <WiringTheFleet />
      <HttpChannel />
      <PageLifecycle />
      <TalkingToClaude />
      <WatchingItSettle />
      <Checkpoint />
      <Recap />
      <Challenge />
      <ApisUsed />
    </>
  );
};

export default PageWriter;
