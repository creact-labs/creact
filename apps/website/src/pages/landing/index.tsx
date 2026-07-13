import type { Component } from "solid-js";
import { t } from "@/i18n";
import CommandBlock from "@/shared/components/command-block";
import GithubIcon from "@/shared/components/github-icon";
import VersionBadge from "@/shared/components/version-badge";
import logoUrl from "../../../assets/logo.jpeg";

const repo = "https://github.com/creact-labs/creact";

const LandingPage: Component = () => {
  return (
    <div class="container">
      <header class="nav">
        <div class="nav-logo">
          <a
            href="#/"
            style={{
              display: "flex",
              "align-items": "center",
              gap: "12px",
              "text-decoration": "none",
              color: "inherit",
            }}
          >
            <img src={logoUrl} alt={t("landing.logo_alt")} />
            <span>{t("landing.brand")}</span>
          </a>
        </div>
        <nav class="nav-links" aria-label={t("landing.nav_aria")}>
          <a href="#/docs">{t("landing.nav_docs")}</a>
          <a href={repo} target="_blank" rel="noopener" class="nav-github">
            <GithubIcon />
            {t("landing.nav_github")}
          </a>
        </nav>
      </header>

      <main class="hero">
        <div class="hero-header">
          <div class="hero-logo">
            <img src={logoUrl} alt={t("landing.logo_alt")} />
          </div>
          <h1 class="hero-title">{t("landing.brand")}</h1>
        </div>
        <p class="hero-subtitle">{t("landing.hero_subtitle")}</p>

        <div class="hero-quickstart">
          <span class="hero-quickstart-label">
            {t("landing.quickstart_label")}
          </span>
          <CommandBlock
            command={t("landing.quickstart_command")}
            copyLabel={t("landing.quickstart_copy")}
            copiedLabel={t("landing.quickstart_copied")}
          />
        </div>

        <div class="hero-cta">
          <a href="#/docs" class="btn btn-primary">
            {t("landing.get_started")} <span>&rarr;</span>
          </a>
        </div>
      </main>

      <footer class="footer">
        <div class="footer-content">
          <a href={repo} target="_blank" rel="noopener">
            {t("landing.nav_github")}
          </a>
          <span class="footer-sep">&middot;</span>
          <span>{t("landing.footer_license")}</span>
          <span class="footer-sep">&middot;</span>
          <VersionBadge />
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
