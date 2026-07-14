import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";
import PlaygroundLink from "@/shared/components/playground-link";

const appFile = "uptime-monitor/src/app.tsx";
const httpCheckFile = "uptime-monitor/src/components/http-check/index.tsx";
const statusPageFile = "uptime-monitor/src/components/status-page/index.tsx";
const alertFile = "uptime-monitor/src/components/alert/index.tsx";

function Intro() {
  return (
    <>
      <h1>{t("docs.examples.uptime_monitor.title")}</h1>
      <p class="docs-description">
        <Trans
          k="docs.examples.uptime_monitor.description"
          components={[Code]}
        />
      </p>
    </>
  );
}

function RunItRun() {
  return (
    <>
      <DocHeading level={2} id="run-it">
        {t("docs.examples.uptime_monitor.heading_run")}
      </DocHeading>
      <p>{t("docs.examples.uptime_monitor.run_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.uptime_monitor.code_run")}
        filename={t("docs.examples.uptime_monitor.filename_terminal")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.run_watch_note"
          components={[Code, Code, Code, Code]}
        />
      </p>
      <p>{t("docs.examples.uptime_monitor.run_output_intro")}</p>
      <PlaygroundLink app="uptime-monitor" />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.run_output_note"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function RunItEntry() {
  return (
    <>
      <p>
        <Trans
          k="docs.examples.uptime_monitor.entry_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample("uptime-monitor/index.tsx", "entry-point")}
        filename={t("docs.examples.uptime_monitor.filename_entry")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.entry_note"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function TheTargets() {
  return (
    <>
      <DocHeading level={2} id="the-targets">
        {t("docs.examples.uptime_monitor.heading_targets")}
      </DocHeading>
      <p>{t("docs.examples.uptime_monitor.targets_intro")}</p>
      <DocCodeBlock
        code={codeSample(appFile, "targets")}
        filename={t("docs.examples.uptime_monitor.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.targets_note"
          components={[Code]}
        />
      </p>
      <p>{t("docs.examples.uptime_monitor.sweep_state_intro")}</p>
      <DocCodeBlock
        code={codeSample(appFile, "sweep-state")}
        filename={t("docs.examples.uptime_monitor.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.sweep_state_note"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function Probing() {
  return (
    <>
      <DocHeading level={2} id="probing">
        {t("docs.examples.uptime_monitor.heading_probing")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.uptime_monitor.probe_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(httpCheckFile, "probe")}
        filename={t("docs.examples.uptime_monitor.filename_http_check")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.probe_note"
          components={[Code]}
        />
      </p>
      <p>
        <Trans
          k="docs.examples.uptime_monitor.sweep_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(httpCheckFile, "sweep")}
        filename={t("docs.examples.uptime_monitor.filename_http_check")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.sweep_note"
          components={[Code, Code]}
        />
      </p>
      <p>{t("docs.examples.uptime_monitor.sweep_lifecycle_intro")}</p>
      <DocCodeBlock
        code={codeSample(httpCheckFile, "sweep-lifecycle")}
        filename={t("docs.examples.uptime_monitor.filename_http_check")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.sweep_lifecycle_note"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function DurableTallies() {
  return (
    <>
      <DocHeading level={2} id="durable-tallies">
        {t("docs.examples.uptime_monitor.heading_tallies")}
      </DocHeading>
      <p>{t("docs.examples.uptime_monitor.tally_intro")}</p>
      <DocCodeBlock
        code={codeSample(httpCheckFile, "durable-tally-wiring")}
        filename={t("docs.examples.uptime_monitor.filename_http_check")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.tally_note"
          components={[Code]}
        />
      </p>
      <p>{t("docs.examples.uptime_monitor.tally_helper_intro")}</p>
      <DocCodeBlock
        code={codeSample(httpCheckFile, "durable-tally")}
        filename={t("docs.examples.uptime_monitor.filename_http_check")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.tally_helper_note"
          components={[Code]}
        />
      </p>
      <p>{t("docs.examples.uptime_monitor.transitions_intro")}</p>
      <DocCodeBlock
        code={codeSample(httpCheckFile, "transitions")}
        filename={t("docs.examples.uptime_monitor.filename_http_check")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.transitions_note"
          components={[Code, Code, Code]}
        />
      </p>
      <Callout type="tip">
        <p>
          <Trans
            k="docs.examples.uptime_monitor.checkpoint"
            components={[Code, Code, Code, Code]}
          />
        </p>
      </Callout>
    </>
  );
}

function DerivingStatus() {
  return (
    <>
      <DocHeading level={2} id="deriving-status">
        {t("docs.examples.uptime_monitor.heading_deriving")}
      </DocHeading>
      <p>{t("docs.examples.uptime_monitor.derived_intro")}</p>
      <DocCodeBlock
        code={codeSample(appFile, "derived-status")}
        filename={t("docs.examples.uptime_monitor.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.derived_note"
          components={[Code, Code]}
        />
      </p>
      <p>{t("docs.examples.uptime_monitor.incidents_intro")}</p>
      <DocCodeBlock
        code={codeSample(appFile, "incidents")}
        filename={t("docs.examples.uptime_monitor.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.incidents_note"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function RenderingTheTree() {
  return (
    <>
      <DocHeading level={2} id="rendering-the-tree">
        {t("docs.examples.uptime_monitor.heading_tree")}
      </DocHeading>
      <p>{t("docs.examples.uptime_monitor.layout_intro")}</p>
      <DocCodeBlock
        code={codeSample(appFile, "layout")}
        filename={t("docs.examples.uptime_monitor.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.layout_note"
          components={[Code, Code, Code, Code, Code]}
        />
      </p>
      <p>{t("docs.examples.uptime_monitor.banner_intro")}</p>
      <DocCodeBlock
        code={codeSample(appFile, "status-banner")}
        filename={t("docs.examples.uptime_monitor.filename_app")}
      />
      <p>{t("docs.examples.uptime_monitor.fault_intro")}</p>
      <DocCodeBlock
        code={codeSample(appFile, "monitor-fault")}
        filename={t("docs.examples.uptime_monitor.filename_app")}
      />
      <p>{t("docs.examples.uptime_monitor.fault_note")}</p>
    </>
  );
}

function TheStatusPage() {
  return (
    <>
      <DocHeading level={2} id="the-status-page">
        {t("docs.examples.uptime_monitor.heading_status_page")}
      </DocHeading>
      <p>{t("docs.examples.uptime_monitor.rows_intro")}</p>
      <DocCodeBlock
        code={codeSample(statusPageFile, "uptime-rows")}
        filename={t("docs.examples.uptime_monitor.filename_status_page")}
      />
      <p>{t("docs.examples.uptime_monitor.rows_note")}</p>
      <p>{t("docs.examples.uptime_monitor.write_effect_intro")}</p>
      <DocCodeBlock
        code={codeSample(statusPageFile, "write-effect")}
        filename={t("docs.examples.uptime_monitor.filename_status_page")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.write_effect_note"
          components={[Code]}
        />
      </p>
      <p>{t("docs.examples.uptime_monitor.render_html_intro")}</p>
      <DocCodeBlock
        code={codeSample(statusPageFile, "render-html")}
        filename={t("docs.examples.uptime_monitor.filename_status_page")}
      />
      <p>{t("docs.examples.uptime_monitor.publish_intro")}</p>
      <DocCodeBlock
        code={codeSample(statusPageFile, "publish")}
        filename={t("docs.examples.uptime_monitor.filename_status_page")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.publish_note"
          components={[Code]}
        />
      </p>
    </>
  );
}

function AlertingOnce() {
  return (
    <>
      <DocHeading level={2} id="alerting-once">
        {t("docs.examples.uptime_monitor.heading_alerting")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.uptime_monitor.alert_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(alertFile, "first-failure")}
        filename={t("docs.examples.uptime_monitor.filename_alert")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.alert_note"
          components={[Code]}
        />
      </p>
      <p>{t("docs.examples.uptime_monitor.alert_log_intro")}</p>
      <DocCodeBlock
        code={codeSample(alertFile, "alert-log")}
        filename={t("docs.examples.uptime_monitor.filename_alert")}
      />
      <p>
        <Trans
          k="docs.examples.uptime_monitor.alert_log_note"
          components={[Code]}
        />
      </p>
    </>
  );
}

function Recap() {
  return (
    <>
      <DocHeading level={2} id="recap">
        {t("docs.examples.uptime_monitor.heading_recap")}
      </DocHeading>
      <ul>
        <li>
          <Trans
            k="docs.examples.uptime_monitor.recap_signals"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.uptime_monitor.recap_lifecycle"
            components={[Code, Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.uptime_monitor.recap_durable"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.uptime_monitor.recap_memos"
            components={[Code, Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.uptime_monitor.recap_flow"
            components={[Code, Code, Code, Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.uptime_monitor.recap_reaction"
            components={[Code]}
          />
        </li>
      </ul>
      <Callout type="tip">
        <p>
          <Trans
            k="docs.examples.uptime_monitor.challenge"
            components={[Code, Code]}
          />
        </p>
      </Callout>
    </>
  );
}

function ApisUsed() {
  return (
    <>
      <DocHeading level={2} id="apis-used">
        {t("docs.examples.uptime_monitor.heading_apis")}
      </DocHeading>
      <ul>
        <li>
          <TextLink href="#/docs/api/reactive/create-signal">
            {t("docs.examples.uptime_monitor.api_create_signal")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/create-effect">
            {t("docs.examples.uptime_monitor.api_create_effect")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/create-memo">
            {t("docs.examples.uptime_monitor.api_create_memo")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/create-computed">
            {t("docs.examples.uptime_monitor.api_create_computed")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/batch">
            {t("docs.examples.uptime_monitor.api_batch")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/untrack">
            {t("docs.examples.uptime_monitor.api_untrack")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/reactive/on">
            {t("docs.examples.uptime_monitor.api_on")}
          </TextLink>
        </li>
        <ApisUsedRest />
      </ul>
    </>
  );
}

function ApisUsedRest() {
  return (
    <>
      <li>
        <TextLink href="#/docs/api/lifecycle/on-mount">
          {t("docs.examples.uptime_monitor.api_on_mount")}
        </TextLink>
      </li>
      <li>
        <TextLink href="#/docs/api/lifecycle/on-cleanup">
          {t("docs.examples.uptime_monitor.api_on_cleanup")}
        </TextLink>
      </li>
      <li>
        <TextLink href="#/docs/api/reactive/create-reaction">
          {t("docs.examples.uptime_monitor.api_create_reaction")}
        </TextLink>
      </li>
      <li>
        <TextLink href="#/docs/api/components/show">
          {t("docs.examples.uptime_monitor.api_show")}
        </TextLink>
      </li>
      <li>
        <TextLink href="#/docs/api/components/for">
          {t("docs.examples.uptime_monitor.api_for")}
        </TextLink>
      </li>
      <li>
        <TextLink href="#/docs/api/components/switch-match">
          {t("docs.examples.uptime_monitor.api_switch_match")}
        </TextLink>
      </li>
      <li>
        <TextLink href="#/docs/api/components/error-boundary">
          {t("docs.examples.uptime_monitor.api_error_boundary")}
        </TextLink>
      </li>
    </>
  );
}

const UptimeMonitor: Component = () => {
  return (
    <>
      <Intro />
      <RunItRun />
      <RunItEntry />
      <TheTargets />
      <Probing />
      <DurableTallies />
      <DerivingStatus />
      <RenderingTheTree />
      <TheStatusPage />
      <AlertingOnce />
      <Recap />
      <ApisUsed />
    </>
  );
};

export default UptimeMonitor;
