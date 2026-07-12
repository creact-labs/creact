import type { Component } from "solid-js";
import { t } from "@/i18n";
import GithubIcon from "@/shared/components/github-icon";
import logoUrl from "../../../assets/logo.jpeg";

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
            <img src={logoUrl} alt={t("common.logo_alt")} />
            <span>{t("common.brand")}</span>
          </a>
        </div>
        <nav class="nav-links" aria-label="Main navigation">
          <a href="#/docs">{t("common.nav.docs")}</a>
          <a
            href="https://github.com/creact-labs/creact"
            target="_blank"
            rel="noopener"
            class="nav-github"
          >
            <GithubIcon />
            {t("common.nav.github")}
          </a>
        </nav>
      </header>

      <main class="hero">
        <div class="hero-header">
          <div class="hero-logo">
            <img src={logoUrl} alt={t("common.logo_alt")} />
          </div>
          <h1 class="hero-title">{t("common.brand")}</h1>
        </div>
        <p class="hero-subtitle">{t("landing.hero_subtitle")}</p>
        <div class="hero-code">
          <div class="code-box">
            <div class="code-header">
              <span class="code-dot"></span>
              <span class="code-dot"></span>
              <span class="code-dot"></span>
              <span class="code-filename">app.tsx</span>
            </div>
            <pre class="code-content" innerHTML={codeExample} />
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
            {t("common.nav.github")}
          </a>
          <span class="footer-sep">&middot;</span>
          <span>{t("landing.footer_license")}</span>
        </div>
      </footer>
    </div>
  );
};

const codeExample = `<span class="kw">export function</span> <span class="fn">App</span>() {
  <span class="kw">const</span> [sites, setSites] = <span class="fn">createSignal</span>&lt;<span class="cmp">SiteConfig</span>[]&gt;([]);

  <span class="kw">return</span> (
    <span class="br">&lt;&gt;</span>
      <span class="br">&lt;</span><span class="cmp">Channel</span> <span class="prop">port</span>={<span class="str">3000</span>} <span class="prop">onGenerate</span>={handleGenerate} <span class="prop">onList</span>={handleList} <span class="br">/&gt;</span>
      <span class="br">&lt;</span><span class="cmp">Claude</span><span class="br">&gt;</span>
        <span class="br">&lt;</span><span class="cmp">Show</span> <span class="prop">when</span>={() <span class="kw">=&gt;</span> pendingGeneration()}<span class="br">&gt;</span>
          {(gen) <span class="kw">=&gt;</span> (
            <span class="br">&lt;</span><span class="cmp">GenerateHtml</span> <span class="prop">prompt</span>={gen().prompt} <span class="br">/&gt;</span>
          )}
        <span class="br">&lt;/</span><span class="cmp">Show</span><span class="br">&gt;</span>
      <span class="br">&lt;/</span><span class="cmp">Claude</span><span class="br">&gt;</span>
      <span class="br">&lt;</span><span class="cmp">AWS</span> <span class="prop">region</span>=<span class="str">"us-east-1"</span><span class="br">&gt;</span>
        <span class="br">&lt;</span><span class="cmp">For</span> <span class="prop">each</span>={() <span class="kw">=&gt;</span> sites()}<span class="br">&gt;</span>
          {(site) <span class="kw">=&gt;</span> (
            <span class="br">&lt;</span><span class="cmp">WebSite</span> <span class="prop">name</span>={() <span class="kw">=&gt;</span> site().path} <span class="prop">content</span>={() <span class="kw">=&gt;</span> site().content} <span class="br">/&gt;</span>
          )}
        <span class="br">&lt;/</span><span class="cmp">For</span><span class="br">&gt;</span>
      <span class="br">&lt;/</span><span class="cmp">AWS</span><span class="br">&gt;</span>
    <span class="br">&lt;/&gt;</span>
  );
}`;

export default LandingPage;
