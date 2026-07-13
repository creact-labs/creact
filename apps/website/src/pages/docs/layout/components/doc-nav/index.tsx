import type { Component } from "solid-js";
import { t } from "@/i18n";
import GithubIcon from "@/shared/components/github-icon";
import MobileSidebarToggle from "./mobile-sidebar-toggle";
import logoWhite from "../../../../../../assets/logo_white.svg";
import logoBlack from "../../../../../../assets/logo_black.svg";

const DocNav: Component = () => {
  return (
    <header class="docs-nav">
      <div style={{ display: "flex", "align-items": "center", gap: "12px" }}>
        <MobileSidebarToggle />
        <a href="#/" class="docs-nav-logo">
          <picture>
            <source srcset={logoBlack} media="(prefers-color-scheme: light)" />
            <img src={logoWhite} alt={t("docs.layout.logo_alt")} />
          </picture>
          <span>{t("docs.layout.brand")}</span>
        </a>
      </div>
      <div class="docs-nav-right">
        <a href="#/docs">{t("docs.layout.nav_docs")}</a>
        <a
          href="https://github.com/creact-labs/creact"
          target="_blank"
          rel="noopener"
          class="docs-nav-github"
        >
          <GithubIcon />
          {t("docs.layout.nav_github")}
        </a>
      </div>
    </header>
  );
};

export default DocNav;
