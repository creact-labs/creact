import type { Component } from "solid-js";
import { Show, createResource } from "solid-js";
import { t } from "@/i18n";
import { codeSample } from "@/shared/code-sample";
import GithubIcon from "@/shared/components/github-icon";
import { getHighlighter } from "@/shared/shiki";
import logoUrl from "../../../assets/logo.jpeg";

// The hero sample is sliced from a real, type-checked example app
const heroCode = codeSample("page-writer/src/app.tsx", "hero");

const LandingPage: Component = () => {
  const [highlighted] = createResource(async () => {
    const highlighter = await getHighlighter();
    return highlighter.codeToHtml(heroCode, {
      lang: "tsx",
      themes: { dark: "github-dark", light: "github-light" },
      defaultColor: false,
    });
  });
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
          <a
            href="https://github.com/creact-labs/creact"
            target="_blank"
            rel="noopener"
            class="nav-github"
          >
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
        <div class="hero-code">
          <div class="code-box">
            <div class="code-header">
              <span class="code-dot"></span>
              <span class="code-dot"></span>
              <span class="code-dot"></span>
              <span class="code-filename">{t("landing.code_filename")}</span>
            </div>
            <Show
              when={highlighted()}
              fallback={
                <pre class="code-content">
                  <code>{heroCode}</code>
                </pre>
              }
            >
              <div class="code-content" innerHTML={highlighted()} />
            </Show>
          </div>
        </div>
        <div class="hero-cta">
          <a href="#/docs" class="btn btn-primary">
            {t("landing.get_started")} <span>&rarr;</span>
          </a>
          <a
            href="https://github.com/creact-labs/ai-powered-aws-website-generator"
            class="btn btn-outline"
            target="_blank"
            rel="noopener"
          >
            {t("landing.view_demo")} <span>&rarr;</span>
          </a>
        </div>
      </main>

      <footer class="footer">
        <div class="footer-content">
          <span class="footer-sep">&middot;</span>
          <a href="https://github.com/drn1996" target="_blank" rel="noopener">
            {t("landing.nav_github")}
          </a>
          <span class="footer-sep">&middot;</span>
          <span>{t("landing.footer_license")}</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
