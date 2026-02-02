import { Component } from 'solid-js';
import logoUrl from '../assets/logo.jpeg';

const App: Component = () => {
  return (
    <>
      <main class="page">
        <header class="header">
          <div class="logo">
            <img src={logoUrl} alt="CReact Logo" />
          </div>
          <h1 class="title">CReact</h1>
        </header>
        
        <p class="tagline">Declarative universal reactive runtime</p>
        
        <a 
          href="https://github.com/creact-labs/creact" 
          class="github-btn"
          target="_blank"
          rel="noopener"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" class="github-icon">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
        
        <div class="code-box">
          <div class="code-header">
            <span class="code-dot" />
            <span class="code-dot" />
            <span class="code-dot" />
            <span class="code-filename">agent.tsx</span>
          </div>
          <pre class="code-content" innerHTML={codeExample} />
        </div>
        
        <nav class="links">
          <a
            href="https://github.com/creact-labs/creact/tree/main/docs/getting-started"
            class="link"
            target="_blank"
            rel="noopener"
          >
            Getting Started
            <span class="link-arrow">→</span>
          </a>

          <a
            href="https://github.com/creact-labs/creact/tree/main/docs/concepts"
            class="link"
            target="_blank"
            rel="noopener"
          >
            Concepts
            <span class="link-arrow">→</span>
          </a>

          <a
            href="https://github.com/creact-labs/creact-agentic-chatbot-example"
            class="link"
            target="_blank"
            rel="noopener"
          >
            Demo
            <span class="link-arrow">→</span>
          </a>
        </nav>
      </main>
      
      <footer class="footer">
        <div class="contact">
          <p class="contact-name">Daniel Coutinho Ribeiro</p>
          <div class="contact-links">
            <a href="https://github.com/drn1996" class="contact-link" target="_blank" rel="noopener">
              GitHub
            </a>
          </div>
        </div>
        <p class="footer-license">Apache 2.0 License</p>
      </footer>
    </>
  );
};

const codeExample = `<span class="kw">function</span> <span class="fn">ChatAgent</span>({ prompt }) {
  <span class="kw">return</span> (
    <span class="br">&lt;</span><span class="cmp">ChatModel</span> <span class="prop">model</span>=<span class="str">"gpt-4o"</span><span class="br">&gt;</span>
      {(model) <span class="kw">=&gt;</span> (
        <span class="br">&lt;</span><span class="cmp">Memory</span><span class="br">&gt;</span>
          {(memory) <span class="kw">=&gt;</span> (
            <span class="br">&lt;</span><span class="cmp">Agent</span>
              <span class="prop">prompt</span>={prompt}
              <span class="prop">modelId</span>={model.<span class="fn">id</span>()}
              <span class="prop">memoryId</span>={memory.<span class="fn">id</span>()}
            <span class="br">/&gt;</span>
          )}
        <span class="br">&lt;/</span><span class="cmp">Memory</span><span class="br">&gt;</span>
      )}
    <span class="br">&lt;/</span><span class="cmp">ChatModel</span><span class="br">&gt;</span>
  );
}

<span class="kw">await</span> <span class="fn">renderCloudDOM</span>(<span class="br">&lt;</span><span class="cmp">ChatAgent</span> <span class="prop">prompt</span>=<span class="str">"Hello!"</span> <span class="br">/&gt;</span>, <span class="str">'my-agent'</span>);`;

export default App;
