/**
 * Samples for the AI Integration guide. The Anthropic stand-in mirrors the
 * SDK surface used here so the samples compile without the dependency;
 * in a real project: `npm install @anthropic-ai/sdk`.
 */
import {
  type Accessor,
  access,
  type CReactNode,
  createContext,
  createEffect,
  createSignal,
  type MaybeAccessor,
  Show,
  untrack,
  useContext,
} from "@creact-labs/creact";
import { Read, Write } from "./file-system";
import type { SiteConfig } from "./http-apis";

interface MessageCreateParams {
  model: string;
  max_tokens: number;
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

interface TextBlock {
  type: "text";
  text: string;
}

/** Anthropic-SDK-shaped stand-in; swap for the real `@anthropic-ai/sdk` */
class Anthropic {
  messages = {
    create: async (
      _params: MessageCreateParams,
    ): Promise<{ content: TextBlock[] }> => ({ content: [] }),
  };
}

/** Marks a generation as applied to the site list */
function updateSiteContent(_id: string, _content: string): void {}

// #region provider
interface CompletionOptions {
  prompt: string;
  system?: string;
  maxTokens?: number;
}

const ClaudeContext = createContext<{
  complete: (options: CompletionOptions) => Promise<string>;
} | null>(null);

/** The first text block of a response, or empty when the model sent none */
function firstText(content: Array<{ type: string; text?: string }>): string {
  const textBlock = content.find((block) => block.type === "text");
  if (!textBlock) return "";
  return textBlock.text ?? "";
}

export function ClaudeProvider(props: {
  model?: string;
  children: CReactNode;
}) {
  const model = props.model ?? "claude-sonnet-4-20250514";
  const client = new Anthropic();

  async function complete(options: CompletionOptions): Promise<string> {
    const response = await client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      system: options.system,
      messages: [{ role: "user", content: options.prompt }],
    });

    return firstText(response.content);
  }

  return (
    <ClaudeContext.Provider value={{ complete }}>
      {props.children}
    </ClaudeContext.Provider>
  );
}

export function useComplete() {
  const ctx = useContext(ClaudeContext);
  if (!ctx) throw new Error("useComplete must be used inside <ClaudeProvider>");
  return ctx.complete;
}
// #endregion provider

// #region generate-component
const SYSTEM_PROMPT = `You are an HTML generator. Output ONLY the HTML content, no markdown or explanations.`;

interface GenerateHtmlProps {
  existingContent: Accessor<string>;
  prompt: MaybeAccessor<string>;
  onGenerated: (content: string) => void;
}

export function GenerateHtml(props: GenerateHtmlProps) {
  const complete = useComplete();
  const [generatedPrompt, setGeneratedPrompt] = createSignal("");

  createEffect(() => {
    const prompt = access(props.prompt);
    if (!prompt) return;

    const alreadyGenerated = untrack(() => generatedPrompt());
    if (prompt === alreadyGenerated) return;

    setGeneratedPrompt(prompt);

    (async () => {
      const existing = props.existingContent();
      const userPrompt = existing
        ? `Current HTML:\n\`\`\`html\n${existing}\n\`\`\`\n\nRequested changes: ${prompt}`
        : `Create a new HTML document: ${prompt}`;

      const html = await complete({ system: SYSTEM_PROMPT, prompt: userPrompt });
      props.onGenerated(html);
    })();
  });

  return <></>;
}
// #endregion generate-component

// #region reactive-pipeline
function App() {
  const [pendingGeneration, setPendingGeneration] =
    createSignal<SiteConfig | null>(null);

  return (
    <ClaudeProvider>
      <Show when={() => pendingGeneration()}>
        {(gen) => {
          const { id, path, prompt } = gen();
          const [content, setContent] = createSignal("");
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
}
// #endregion reactive-pipeline

export { App };
