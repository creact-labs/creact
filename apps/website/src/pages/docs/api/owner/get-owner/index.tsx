import type { Component } from "solid-js";
import { Trans, t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import ApiReference from "@/shared/components/api-reference";
import Code from "@/shared/components/code";
import TextLink from "@/shared/components/text-link";
import UsageSection from "@/shared/components/usage-section";

const page = "page-writer/src/components/page/index.tsx";

const GetOwner: Component = () => {
  return (
    <>
      <h1>{t("docs.api.owner.get_owner.title")}</h1>
      <p class="docs-description">{t("docs.api.owner.get_owner.description")}</p>

      <ApiReference
        name={t("docs.api.owner.get_owner.title")}
        signature={t("docs.api.owner.get_owner.signature")}
        returns={
          <p>
            <Trans
              k="docs.api.owner.get_owner.returns_desc"
              components={[Code, Code]}
            />
          </p>
        }
      />

      <UsageSection
        code={codeSample(page, "states")}
        filename={t("docs.api.owner.get_owner.filename_page")}
      >
        <p>
          <Trans
            k="docs.api.owner.get_owner.usage_states"
            components={[Code, Code, Code]}
          />
        </p>
      </UsageSection>

      <p>
        <Trans
          k="docs.api.owner.get_owner.in_the_wild"
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

export default GetOwner;
