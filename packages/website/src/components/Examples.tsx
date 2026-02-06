import { type Component, createSignal, For } from "solid-js";
import CodeBlock from "./CodeBlock";

const examples = [
  {
    label: "Persistent Counter",
    filename: "app.tsx",
    description:
      "State persists across restarts. The counter picks up where it left off.",
    code: `<span class="kw">import</span> { useAsyncOutput, createEffect } <span class="kw">from</span> <span class="str">'@creact-labs/creact'</span>;

<span class="kw">export function</span> <span class="fn">App</span>() {
  <span class="kw">const</span> counter = <span class="fn">useAsyncOutput</span>({}, <span class="kw">async</span> (_props, setOutputs) <span class="kw">=&gt;</span> {
    <span class="cmt">// Start from previous value, or 0</span>
    <span class="fn">setOutputs</span>(prev <span class="kw">=&gt;</span> ({ count: prev?.count ?? <span class="str">0</span> }));

    <span class="cmt">// Tick every second</span>
    <span class="kw">const</span> interval = <span class="fn">setInterval</span>(() <span class="kw">=&gt;</span> {
      <span class="fn">setOutputs</span>(prev <span class="kw">=&gt;</span> ({
        count: (prev?.count ?? <span class="str">0</span>) + <span class="str">1</span>
      }));
    }, <span class="str">1000</span>);

    <span class="kw">return</span> () <span class="kw">=&gt;</span> <span class="fn">clearInterval</span>(interval);
  });

  <span class="fn">createEffect</span>(() <span class="kw">=&gt;</span> {
    console.<span class="fn">log</span>(<span class="str">'Count:'</span>, counter.<span class="fn">count</span>());
  });

  <span class="kw">return</span> <span class="br">&lt;&gt;&lt;/&gt;</span>;
}`,
  },
  {
    label: "S3 Website",
    filename: "app.tsx",
    description:
      "Deploy a static site to S3. Read a file, create a bucket, upload it — all declared.",
    code: `<span class="kw">import</span> { <span class="cmp">AWS</span> } <span class="kw">from</span> <span class="str">'./components/aws'</span>;
<span class="kw">import</span> { <span class="cmp">Read</span> } <span class="kw">from</span> <span class="str">'./components/read'</span>;
<span class="kw">import</span> { <span class="cmp">WebSite</span> } <span class="kw">from</span> <span class="str">'./components/website'</span>;

<span class="kw">export function</span> <span class="fn">App</span>() {
  <span class="kw">return</span> (
    <span class="br">&lt;</span><span class="cmp">AWS</span> <span class="prop">region</span>=<span class="str">"us-east-1"</span><span class="br">&gt;</span>
      <span class="br">&lt;</span><span class="cmp">Read</span> <span class="prop">path</span>=<span class="str">"./resources/my-frontend"</span> <span class="prop">file</span>=<span class="str">"index.html"</span><span class="br">&gt;</span>
        {(content) <span class="kw">=&gt;</span> <span class="br">&lt;</span><span class="cmp">WebSite</span> <span class="prop">content</span>={content} <span class="br">/&gt;</span>}
      <span class="br">&lt;/</span><span class="cmp">Read</span><span class="br">&gt;</span>
    <span class="br">&lt;/</span><span class="cmp">AWS</span><span class="br">&gt;</span>
  );
}`,
  },
  {
    label: "Multi-Site Platform",
    filename: "app.tsx",
    description:
      "A platform that manages many sites. Add an HTTP API, AI generation, and dynamic deployment.",
    code: `<span class="kw">export function</span> <span class="fn">App</span>() {
  <span class="kw">const</span> [sites, setSites] = <span class="fn">createSignal</span>&lt;<span class="cmp">SiteConfig</span>[]&gt;([]);

  <span class="kw">return</span> (
    <span class="br">&lt;&gt;</span>
      <span class="br">&lt;</span><span class="cmp">Channel</span> <span class="prop">port</span>={<span class="str">3000</span>}
        <span class="prop">onGenerate</span>={handleGenerate}
        <span class="prop">onList</span>={handleList}
      <span class="br">/&gt;</span>

      <span class="br">&lt;</span><span class="cmp">Claude</span><span class="br">&gt;</span>
        <span class="br">&lt;</span><span class="cmp">Show</span> <span class="prop">when</span>={() <span class="kw">=&gt;</span> pendingGeneration()}<span class="br">&gt;</span>
          {(gen) <span class="kw">=&gt;</span> <span class="br">&lt;</span><span class="cmp">GenerateHtml</span> <span class="prop">prompt</span>={gen().prompt} <span class="br">/&gt;</span>}
        <span class="br">&lt;/</span><span class="cmp">Show</span><span class="br">&gt;</span>
      <span class="br">&lt;/</span><span class="cmp">Claude</span><span class="br">&gt;</span>

      <span class="br">&lt;</span><span class="cmp">AWS</span> <span class="prop">region</span>=<span class="str">"us-east-1"</span><span class="br">&gt;</span>
        <span class="br">&lt;</span><span class="cmp">For</span> <span class="prop">each</span>={() <span class="kw">=&gt;</span> sites()}<span class="br">&gt;</span>
          {(site) <span class="kw">=&gt;</span> (
            <span class="br">&lt;</span><span class="cmp">WebSite</span>
              <span class="prop">name</span>={() <span class="kw">=&gt;</span> site().path}
              <span class="prop">content</span>={() <span class="kw">=&gt;</span> site().content}
            <span class="br">/&gt;</span>
          )}
        <span class="br">&lt;/</span><span class="cmp">For</span><span class="br">&gt;</span>
      <span class="br">&lt;/</span><span class="cmp">AWS</span><span class="br">&gt;</span>
    <span class="br">&lt;/&gt;</span>
  );
}`,
  },
];

const Examples: Component = () => {
  const [activeTab, setActiveTab] = createSignal(0);

  return (
    <section id="examples" class="section">
      <h2 class="section-title">Examples</h2>
      <p class="section-subtitle">
        Real examples from the tutorial — from a persistent counter to a full
        multi-site platform.
      </p>
      <div class="examples-container">
        <div class="tab-bar">
          <For each={examples}>
            {(example, i) => (
              <button
                class={`tab-btn ${activeTab() === i() ? "tab-active" : ""}`}
                onClick={() => setActiveTab(i())}
              >
                {example.label}
              </button>
            )}
          </For>
        </div>
        <p class="example-description">{examples[activeTab()].description}</p>
        <CodeBlock
          filename={examples[activeTab()].filename}
          code={examples[activeTab()].code}
        />
      </div>
    </section>
  );
};

export default Examples;
