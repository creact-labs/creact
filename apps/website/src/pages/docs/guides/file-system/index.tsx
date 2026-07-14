import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import Code from "@/shared/components/code";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocHeading from "@/shared/components/doc-heading";
import TextLink from "@/shared/components/text-link";

const statusPage = "uptime-monitor/src/components/status-page/index.tsx";

function IntroSection() {
  return (
    <>
      <h1>{t("docs.guides.file_system.title")}</h1>
      <p class="docs-description">{t("docs.guides.file_system.description")}</p>
    </>
  );
}

function WriteEffectSection() {
  return (
    <>
      <DocHeading level={2} id="write-effect">
        {t("docs.guides.file_system.heading_write_effect")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.file_system.write_effect_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(statusPage, "write-effect")}
        filename={t("docs.guides.file_system.filename_status_page")}
      />
      <p>
        <Trans
          k="docs.guides.file_system.write_effect_notice"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function PublishSection() {
  return (
    <>
      <DocHeading level={2} id="publish">
        {t("docs.guides.file_system.heading_publish")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.file_system.publish_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample(statusPage, "publish")}
        filename={t("docs.guides.file_system.filename_status_page")}
      />
      <p>{t("docs.guides.file_system.publish_notice")}</p>
    </>
  );
}

function FileMemorySection() {
  return (
    <>
      <DocHeading level={2} id="file-memory">
        {t("docs.guides.file_system.heading_file_memory")}
      </DocHeading>
      <p>
        <Trans
          k="docs.guides.file_system.file_memory_intro"
          components={[Code, Code]}
        />
      </p>
      <DocCodeBlock
        code={codeSample("packages/file-memory/src/index.ts", "file-memory")}
        filename={t("docs.guides.file_system.filename_memory")}
      />
      <p>
        <Trans
          k="docs.guides.file_system.file_memory_notice"
          components={[Code, Code]}
        />
      </p>
    </>
  );
}

function ClosingSection() {
  return (
    <p>
      <Trans
        k="docs.guides.file_system.see_walkthrough"
        components={[
          (props) => (
            <TextLink href="#/docs/examples/uptime-monitor">
              {props.children}
            </TextLink>
          ),
        ]}
      />
    </p>
  );
}

const FileSystem: Component = () => {
  return (
    <>
      <IntroSection />
      <WriteEffectSection />
      <PublishSection />
      <FileMemorySection />
      <ClosingSection />
    </>
  );
};

export default FileSystem;
