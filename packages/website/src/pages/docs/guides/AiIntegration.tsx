import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const AiIntegration: Component = () => {
  return (
    <>
      <h1>AI Integration</h1>
      <p class="docs-description">
        Wrap the Anthropic SDK in a context provider and call Claude from
        reactive effects.
      </p>

      <DocHeading level={2} id="provider">
        Claude Provider
      </DocHeading>
      <p>
        Wrap the Anthropic SDK in a context provider so any child component can
        call the API. The provider creates the client once. Child components
        access it via <code>useComplete()</code>.
      </p>
      <DocCodeBlock
        code={`import { createContext, useContext, type CReactNode } from '@creact-labs/creact';
import Anthropic from '@anthropic-ai/sdk';

interface CompletionOptions {
  prompt: string;
  system?: string;
  maxTokens?: number;
}

const ClaudeContext = createContext<{
  complete: (options: CompletionOptions) => Promise<string>;
} | null>(null);

export function ClaudeProvider(props: { model?: string; children: CReactNode }) {
  const model = props.model ?? 'claude-sonnet-4-20250514';
  const client = new Anthropic();

  async function complete(options: CompletionOptions): Promise<string> {
    const response = await client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      system: options.system,
      messages: [{ role: 'user', content: options.prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.text ?? '';
  }

  return (
    <ClaudeContext.Provider value={{ complete }}>
      {props.children}
    </ClaudeContext.Provider>
  );
}

export function useComplete() {
  const ctx = useContext(ClaudeContext);
  if (!ctx) throw new Error('useComplete must be used inside <ClaudeProvider>');
  return ctx.complete;
}`}
        filename="providers/claude-provider.tsx"
      />

      <DocHeading level={2} id="generate-component">
        Generation Component
      </DocHeading>
      <p>
        The <code>GenerateHtml</code> component calls <code>useComplete()</code>{" "}
        inside a <code>createEffect</code>. When the prompt signal changes, the
        effect fires, calls the API, and passes the result to a callback. The{" "}
        <code>untrack</code> guard prevents duplicate generations.
      </p>
      <DocCodeBlock
        code={`import { createEffect, createSignal, untrack, access, type MaybeAccessor, type Accessor } from '@creact-labs/creact';

const SYSTEM_PROMPT = \`You are an HTML generator. Output ONLY the HTML content, no markdown or explanations.\`;

interface GenerateHtmlProps {
  existingContent: Accessor<string>;
  prompt: MaybeAccessor<string>;
  onGenerated: (content: string) => void;
}

export function GenerateHtml(props: GenerateHtmlProps) {
  const complete = useComplete();
  const [generatedPrompt, setGeneratedPrompt] = createSignal('');

  createEffect(() => {
    const prompt = access(props.prompt);
    if (!prompt) return;

    const alreadyGenerated = untrack(() => generatedPrompt());
    if (prompt === alreadyGenerated) return;

    setGeneratedPrompt(prompt);

    (async () => {
      const existing = props.existingContent();
      const userPrompt = existing
        ? \`Current HTML:\\n\\\`\\\`\\\`html\\n\${existing}\\n\\\`\\\`\\\`\\n\\nRequested changes: \${prompt}\`
        : \`Create a new HTML document: \${prompt}\`;

      const html = await complete({ system: SYSTEM_PROMPT, prompt: userPrompt });
      props.onGenerated(html);
    })();
  });

  return <></>;
}`}
        filename="components/generate-html.tsx"
      />

      <DocHeading level={2} id="reactive-pipeline">
        Reactive Pipeline
      </DocHeading>
      <p>
        The app wires generation and deployment together with <code>Show</code>.
        When a pending generation exists, <code>GenerateHtml</code> runs. When
        it produces content, <code>Write</code> saves it to disk, and the site
        list updates, which triggers AWS deployment downstream.
      </p>
      <DocCodeBlock
        code={`import { Show, createSignal } from '@creact-labs/creact';

function App() {
  const [pendingGeneration, setPendingGeneration] = createSignal<SiteConfig | null>(null);

  return (
    <ClaudeProvider>
      <Show when={() => pendingGeneration()}>
        {(gen) => {
          const { id, path, prompt } = gen();
          const [content, setContent] = createSignal('');
          return (
            <>
              <Read path={path} file="index.html">
                {(existingContent) => (
                  <GenerateHtml
                    existingContent={existingContent}
                    prompt={prompt}
                    onGenerated={setContent}
                  />
                )}
              </Read>
              <Show when={() => content()}>
                {() => (
                  <Write
                    path={path}
                    file="index.html"
                    content={() => content()}
                    onWritten={() => {
                      updateSiteContent(id, content());
                      setPendingGeneration(null);
                    }}
                  />
                )}
              </Show>
            </>
          );
        }}
      </Show>
    </ClaudeProvider>
  );
}`}
        filename="app.tsx"
      />

      <Callout type="tip">
        <p>
          AI outputs are persisted like any other <code>useAsyncOutput</code>{" "}
          result. The generation only runs again if its input props change.
        </p>
      </Callout>
    </>
  );
};

export default AiIntegration;
