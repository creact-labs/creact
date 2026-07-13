import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Callout from "@/shared/components/callout";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const entry = "tenant-fleet/index.tsx";
const app = "tenant-fleet/src/app.tsx";
const tenantApp = "tenant-fleet/src/components/tenant-app/index.tsx";
const fleetStatus = "tenant-fleet/src/components/fleet-status/index.tsx";

const TenantFleet: Component = () => {
  return (
    <>
      <h1>{t("docs.examples.tenant_fleet.title")}</h1>
      <p class="docs-description">
        {t("docs.examples.tenant_fleet.description")}
      </p>

      <DocHeading level={2} id="run-it">
        {t("docs.examples.tenant_fleet.heading_run")}
      </DocHeading>
      <p>{t("docs.examples.tenant_fleet.run_entry_intro")}</p>
      <DocCodeBlock
        code={codeSample(entry, "entry-point")}
        filename={t("docs.examples.tenant_fleet.filename_index_tsx")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.run_intro"
          components={[Code, Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.tenant_fleet.code_run")}
        filename={t("docs.examples.tenant_fleet.filename_terminal")}
      />
      <p>{t("docs.examples.tenant_fleet.run_output_intro")}</p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.tenant_fleet.code_run_output")}
        filename={t("docs.examples.tenant_fleet.filename_output")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.ledgers_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        lang="bash"
        code={t("docs.examples.tenant_fleet.code_ledgers")}
        filename={t("docs.examples.tenant_fleet.filename_structure")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.ledgers_outro"
          components={[Code, Code, Code, Code]}
        />
      </p>

      <DocHeading level={2} id="fleet-spec">
        {t("docs.examples.tenant_fleet.heading_spec")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.tenant_fleet.spec_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        lang="json"
        code={t("docs.examples.tenant_fleet.code_tenants")}
        filename={t("docs.examples.tenant_fleet.filename_tenants")}
      />
      <p>{t("docs.examples.tenant_fleet.spec_read_intro")}</p>
      <DocCodeBlock
        code={codeSample(app, "read-spec")}
        filename={t("docs.examples.tenant_fleet.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.spec_read_outro"
          components={[Code]}
        />
      </p>
      <p>{t("docs.examples.tenant_fleet.spec_watch_intro")}</p>
      <DocCodeBlock
        code={codeSample(app, "watch-spec")}
        filename={t("docs.examples.tenant_fleet.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.spec_watch_outro"
          components={[Code]}
        />
      </p>

      <DocHeading level={2} id="mounting-sovereign-tenants">
        {t("docs.examples.tenant_fleet.heading_mount")}
      </DocHeading>
      <p>{t("docs.examples.tenant_fleet.mount_intro")}</p>
      <DocCodeBlock
        code={codeSample(app, "fleet")}
        filename={t("docs.examples.tenant_fleet.filename_app")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.mount_memory"
          components={[Code, Code, Code]}
        />
      </p>
      <p>
        <Trans
          k="docs.examples.tenant_fleet.mount_lists"
          components={[Code, Code, Code]}
        />
      </p>

      <DocHeading level={2} id="a-tenants-world">
        {t("docs.examples.tenant_fleet.heading_tenant")}
      </DocHeading>
      <p>{t("docs.examples.tenant_fleet.tenant_intro")}</p>
      <DocCodeBlock
        code={codeSample(tenantApp, "tree")}
        filename={t("docs.examples.tenant_fleet.filename_tenant_app")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.tenant_tree_outro"
          components={[Code, Code]}
        />
      </p>
      <p>{t("docs.examples.tenant_fleet.tenant_db_intro")}</p>
      <DocCodeBlock
        code={codeSample(tenantApp, "database")}
        filename={t("docs.examples.tenant_fleet.filename_tenant_app")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.tenant_db_outro"
          components={[Code, Code, Code, Code]}
        />
      </p>
      <p>{t("docs.examples.tenant_fleet.tenant_api_intro")}</p>
      <DocCodeBlock
        code={codeSample(tenantApp, "api")}
        filename={t("docs.examples.tenant_fleet.filename_tenant_app")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.tenant_api_outro"
          components={[Code]}
        />
      </p>

      <DocHeading level={2} id="making-it-a-runtime">
        {t("docs.examples.tenant_fleet.heading_runtime")}
      </DocHeading>
      <p>{t("docs.examples.tenant_fleet.runtime_intro")}</p>
      <DocCodeBlock
        code={codeSample(tenantApp, "runtime-wrap")}
        filename={t("docs.examples.tenant_fleet.filename_tenant_app")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.runtime_outro"
          components={[Code, Code, Code, Code]}
        />
      </p>

      <DocHeading level={2} id="watching-the-fleet">
        {t("docs.examples.tenant_fleet.heading_watch")}
      </DocHeading>
      <p>{t("docs.examples.tenant_fleet.watch_project_intro")}</p>
      <DocCodeBlock
        code={codeSample(fleetStatus, "project")}
        filename={t("docs.examples.tenant_fleet.filename_fleet_status")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.watch_project_outro"
          components={[Code, Code, Code, Code]}
        />
      </p>
      <p>{t("docs.examples.tenant_fleet.watch_summary_intro")}</p>
      <DocCodeBlock
        code={codeSample(fleetStatus, "summary")}
        filename={t("docs.examples.tenant_fleet.filename_fleet_status")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.watch_summary_outro"
          components={[Code]}
        />
      </p>

      <DocHeading level={2} id="checkpoint">
        {t("docs.examples.tenant_fleet.heading_checkpoint")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.tenant_fleet.checkpoint_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        lang="json"
        code={t("docs.examples.tenant_fleet.code_add_tenant")}
        filename={t("docs.examples.tenant_fleet.filename_tenants")}
      />
      <p>
        <Trans
          k="docs.examples.tenant_fleet.checkpoint_attach"
          components={[Code]}
        />
      </p>
      <p>
        <Trans
          k="docs.examples.tenant_fleet.checkpoint_detach"
          components={[Code]}
        />
      </p>
      <Callout type="tip">
        <p>
          <Trans
            k="docs.examples.tenant_fleet.callout_detach"
            components={[Code]}
          />
        </p>
      </Callout>

      <DocHeading level={2} id="recap">
        {t("docs.examples.tenant_fleet.heading_recap")}
      </DocHeading>
      <ul>
        <li>{t("docs.examples.tenant_fleet.recap_spec")}</li>
        <li>
          <Trans
            k="docs.examples.tenant_fleet.recap_for"
            components={[Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.tenant_fleet.recap_memory"
            components={[Code, Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.tenant_fleet.recap_durable"
            components={[Code, Code]}
          />
        </li>
        <li>
          <Trans
            k="docs.examples.tenant_fleet.recap_failure"
            components={[Code, Code]}
          />
        </li>
      </ul>

      <DocHeading level={2} id="challenge">
        {t("docs.examples.tenant_fleet.heading_challenge")}
      </DocHeading>
      <p>
        <Trans
          k="docs.examples.tenant_fleet.challenge_text"
          components={[Code, Code]}
        />
      </p>

      <DocHeading level={2} id="apis-used">
        {t("docs.examples.tenant_fleet.heading_apis")}
      </DocHeading>
      <ul>
        <li>
          <TextLink href="#/docs/api/runtime/create-runtime">
            {t("docs.examples.tenant_fleet.api_create_runtime")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/components/for">
            {t("docs.examples.tenant_fleet.api_for")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/arrays/map-array">
            {t("docs.examples.tenant_fleet.api_map_array")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/arrays/index-array">
            {t("docs.examples.tenant_fleet.api_index_array")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/props/merge-props">
            {t("docs.examples.tenant_fleet.api_merge_props")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/props/split-props">
            {t("docs.examples.tenant_fleet.api_split_props")}
          </TextLink>
        </li>
        <li>
          <TextLink href="#/docs/api/runtime/use-async-output">
            {t("docs.examples.tenant_fleet.api_use_async_output")}
          </TextLink>
        </li>
      </ul>
    </>
  );
};

export default TenantFleet;
