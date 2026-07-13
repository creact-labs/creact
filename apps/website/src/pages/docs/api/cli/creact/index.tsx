import type { Component } from "solid-js";
import { t } from "@/i18n";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import DocTable from "@/shared/components/doc-table";
import RichText from "@/shared/components/rich-text";

const CreactCli: Component = () => {
  return (
    <>
      <h1>{t("docs.api.cli.creact_cli.title")}</h1>
      <p class="docs-description">{t("docs.api.cli.creact_cli.description")}</p>

      <DocHeading level={2} id="usage">
        {t("docs.api.cli.creact_cli.heading_usage")}
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={t("docs.api.cli.creact_cli.code_usage")}
        filename={t("docs.api.cli.creact_cli.filename_terminal")}
      />

      <DocHeading level={2} id="arguments">
        {t("docs.api.cli.creact_cli.heading_arguments")}
      </DocHeading>
      <DocTable
        headers={[
          t("docs.api.cli.creact_cli.table_header_argument"),
          t("docs.api.cli.creact_cli.table_header_description"),
        ]}
        rows={[
          [
            <RichText k="docs.api.cli.creact_cli.row_entry_file_name" />,
            <RichText k="docs.api.cli.creact_cli.row_entry_file_desc" />,
          ],
        ]}
      />

      <DocHeading level={2} id="options">
        {t("docs.api.cli.creact_cli.heading_options")}
      </DocHeading>
      <DocTable
        headers={[
          t("docs.api.cli.creact_cli.table_header_flag"),
          t("docs.api.cli.creact_cli.table_header_description"),
        ]}
        rows={[
          [
            <RichText k="docs.api.cli.creact_cli.row_watch_name" />,
            <RichText k="docs.api.cli.creact_cli.row_watch_desc" />,
          ],
          [
            <RichText k="docs.api.cli.creact_cli.row_help_name" />,
            <RichText k="docs.api.cli.creact_cli.row_help_desc" />,
          ],
        ]}
      />

      <DocHeading level={2} id="examples">
        {t("docs.api.cli.creact_cli.heading_examples")}
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={t("docs.api.cli.creact_cli.code_examples")}
        filename={t("docs.api.cli.creact_cli.filename_terminal")}
      />

      <DocHeading level={2} id="behavior">
        {t("docs.api.cli.creact_cli.heading_behavior")}
      </DocHeading>
      <ol>
        <li>
          <RichText k="docs.api.cli.creact_cli.behavior_typecheck" />
        </li>
        <li>
          <RichText k="docs.api.cli.creact_cli.behavior_execute" />
        </li>
        <li>
          <RichText k="docs.api.cli.creact_cli.behavior_default_export" />
        </li>
        <li>
          <RichText k="docs.api.cli.creact_cli.behavior_render_cycle" />
        </li>
        <li>
          <RichText k="docs.api.cli.creact_cli.behavior_exit" />
        </li>
      </ol>
    </>
  );
};

export default CreactCli;
