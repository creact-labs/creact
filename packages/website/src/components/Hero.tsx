import type { Component } from "solid-js";
import logoUrl from "../../assets/logo.jpeg";
import CodeBlock from "./CodeBlock";

const heroCode = `<span class="cmt">// Providers define the rules. Components declare what exists.</span>
<span class="cmt">// The runtime reconciles the difference.</span>

<span class="kw">function</span> <span class="fn">App</span>() {
  <span class="kw">const</span> [page, setPage] = <span class="fn">createSignal</span>(<span class="str">""</span>);

  <span class="kw">return</span> (
    <span class="br">&lt;</span><span class="cmp">Claude</span><span class="br">&gt;</span>
      <span class="br">&lt;</span><span class="cmp">GenerateHtml</span>
        <span class="prop">prompt</span>=<span class="str">"A page about cats"</span>
        <span class="prop">onGenerated</span>={setPage}
      <span class="br">/&gt;</span>
      <span class="br">&lt;</span><span class="cmp">AWS</span> <span class="prop">region</span>=<span class="str">"us-east-1"</span><span class="br">&gt;</span>
        <span class="br">&lt;</span><span class="cmp">WebSite</span> <span class="prop">content</span>={page} <span class="br">/&gt;</span>
      <span class="br">&lt;/</span><span class="cmp">AWS</span><span class="br">&gt;</span>
    <span class="br">&lt;/</span><span class="cmp">Claude</span><span class="br">&gt;</span>
  );
}`;

const Hero: Component = () => {
  return (
    <section class="hero">
      <div class="hero-content">
        <div class="hero-header">
          <div class="hero-logo">
            <img src={logoUrl} alt="CReact" />
          </div>
          <h1 class="hero-title">CReact</h1>
        </div>
        <p class="hero-subtitle">
          A meta-runtime for building domain-specific, reactive execution
          engines.
        </p>
        <p class="hero-description">
          Providers define the laws of your domain — cloud, AI, databases,
          hardware, anything. Components declare what should exist. The runtime
          reconciles, persists, and keeps it all in sync. Domain-agnostic by
          design.
        </p>
        <div class="hero-cta">
          <a
            href="https://github.com/creact-labs/creact/tree/main/docs"
            class="btn btn-primary"
            target="_blank"
            rel="noopener"
          >
            Tutorial <span>&rarr;</span>
          </a>
          <a
            href="https://github.com/creact-labs/creact"
            class="btn btn-outline"
            target="_blank"
            rel="noopener"
          >
            GitHub <span>&rarr;</span>
          </a>
        </div>
      </div>
      <div class="hero-code">
        <CodeBlock filename="app.tsx" code={heroCode} />
      </div>
    </section>
  );
};

export default Hero;
