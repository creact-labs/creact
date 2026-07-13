import { createResource, Show, type Component } from "solid-js";
import { getHighlighter } from "@/shared/shiki";

interface CodeProps {
  children: string;
}

/**
 * Shiki emits a `<pre class=...><code>…</code></pre>` wrapper. For an inline
 * chip only the token spans belong inside our own `<code>`, so peel both outer
 * tags off and keep the innerHTML between them.
 */
function innerTokens(html: string): string {
  const openCode = html.indexOf("<code");
  const codeStart = html.indexOf(">", openCode) + 1;
  const codeEnd = html.lastIndexOf("</code>");
  if (openCode === -1 || codeEnd === -1) return html;
  return html.slice(codeStart, codeEnd);
}

/**
 * Inline code span. Renders a plain `<code>` synchronously so there is never a
 * blank flash or layout shift, then swaps in Shiki-highlighted token spans once
 * the singleton highlighter resolves. Types get colored tokens; bare
 * identifiers keep the subtle chip from the article stylesheet.
 */
const Code: Component<CodeProps> = (props) => {
  const [highlighted] = createResource(
    () => props.children,
    async (code) => {
      const highlighter = await getHighlighter();
      const html = highlighter.codeToHtml(code, {
        lang: "tsx",
        themes: {
          dark: "github-dark",
          light: "github-light",
        },
        defaultColor: false,
      });
      return innerTokens(html);
    },
  );

  return (
    <Show
      when={highlighted()}
      fallback={<code class="inline-code">{props.children}</code>}
    >
      <code class="inline-code" innerHTML={highlighted()} />
    </Show>
  );
};

export default Code;
