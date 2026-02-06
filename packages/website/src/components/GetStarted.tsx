import type { Component } from "solid-js";

const GetStarted: Component = () => {
  return (
    <section id="get-started" class="section get-started">
      <h2 class="section-title">Get Started</h2>
      <div class="install-box">
        <code class="install-command">npm install @creact-labs/creact</code>
      </div>
      <div class="get-started-links">
        <a
          href="https://github.com/creact-labs/creact/tree/main/docs"
          class="btn btn-primary"
          target="_blank"
          rel="noopener"
        >
          Read the Tutorial <span>&rarr;</span>
        </a>
        <a
          href="https://github.com/creact-labs/creact"
          class="btn btn-outline"
          target="_blank"
          rel="noopener"
        >
          View on GitHub <span>&rarr;</span>
        </a>
      </div>
    </section>
  );
};

export default GetStarted;
