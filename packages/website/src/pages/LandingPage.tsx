import type { Component } from "solid-js";
import logoUrl from "../../assets/logo.jpeg";

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
            <img src={logoUrl} alt="CReact" />
            <span>CReact</span>
          </a>
        </div>
        <nav class="nav-links" aria-label="Main navigation">
          <a href="#/docs">Docs</a>
          <a
            href="https://github.com/creact-labs/creact"
            target="_blank"
            rel="noopener"
            class="nav-github"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </a>
        </nav>
      </header>

      <main class="hero">
        <div class="hero-header">
          <div class="hero-logo">
            <img src={logoUrl} alt="CReact" />
          </div>
          <h1 class="hero-title">CReact</h1>
        </div>
        <p class="hero-subtitle">
          Use JSX to automate durable workflows
        </p>
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
            Get Started <span>&rarr;</span>
          </a>
          <a
            href="https://github.com/creact-labs/ai-powered-aws-website-generator"
            class="btn btn-outline"
            target="_blank"
            rel="noopener"
          >
            View Demo <span>&rarr;</span>
          </a>
        </div>
      </main>

      <footer class="footer">
        <div class="footer-content">
          <span class="footer-sep">&middot;</span>
          <a href="https://github.com/drn1996" target="_blank" rel="noopener">
            GitHub
          </a>
          <span class="footer-sep">&middot;</span>
          <span>Apache 2.0</span>
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
