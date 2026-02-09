import { createSignal, createResource, Show, type Component } from "solid-js";
import { getHighlighter } from "../../lib/highlighter";

interface DocCodeBlockProps {
  code: string;
  lang?: string;
  filename?: string;
}

const DocCodeBlock: Component<DocCodeBlockProps> = (props) => {
  const [copied, setCopied] = createSignal(false);

  const [highlighted] = createResource(
    () => ({ code: props.code, lang: props.lang || "tsx" }),
    async ({ code, lang }) => {
      const highlighter = await getHighlighter();
      return highlighter.codeToHtml(code, {
        lang,
        theme: "github-dark",
      });
    }
  );

  const copyCode = async () => {
    await navigator.clipboard.writeText(props.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="doc-code-block">
      <div class="doc-code-header">
        <span class="doc-code-filename">{props.filename || ""}</span>
        <button class="doc-code-copy" onClick={copyCode}>
          <Show when={!copied()} fallback={<>Copied</>}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy
          </Show>
        </button>
      </div>
      <Show
        when={highlighted()}
        fallback={<pre><code>{props.code}</code></pre>}
      >
        <div innerHTML={highlighted()} />
      </Show>
    </div>
  );
};

export default DocCodeBlock;
