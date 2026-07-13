import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";

const samples = "integrations/src/file-system.tsx";

const FileSystem: Component = () => {
  return (
    <>
      <h1>{t("docs.guides.file_system.title")}</h1>
      <p class="docs-description">{t("docs.guides.file_system.description")}</p>

      <DocHeading level={2} id="read-component">
        {t("docs.guides.file_system.heading_read_component")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.file_system.read_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "read-component")}
        filename={t("docs.guides.file_system.filename_read")}
      />

      <DocHeading level={2} id="write-component">
        {t("docs.guides.file_system.heading_write_component")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.file_system.write_intro"
          components={[Code, Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "write-component")}
        filename={t("docs.guides.file_system.filename_write")}
      />

      <DocHeading level={2} id="usage">
        {t("docs.guides.file_system.heading_usage")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.file_system.usage_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "usage")}
        filename={t("docs.guides.file_system.filename_app")}
      />

      <DocHeading level={2} id="file-memory">
        {t("docs.guides.file_system.heading_file_memory")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.file_system.file_memory_intro"
          components={[Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(samples, "file-memory")}
        filename={t("docs.guides.file_system.filename_memory")}
      />
    </>
  );
};

export default FileSystem;
