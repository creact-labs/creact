// #region client
import Anthropic from "@creact-labs/example-mock-anthropic";

export interface HtmlWriterClient {
  messages: {
    create(
      request: Anthropic.MessageCreateParamsNonStreaming,
    ): Promise<{ content: ReadonlyArray<{ type: string; text?: string }> }>;
  };
}

export function createHtmlWriterClient(): HtmlWriterClient {
  return new Anthropic();
}
// #endregion client

// #region request
const SYSTEM_PROMPT =
  "You are an expert web designer. Reply with one complete standalone HTML document: " +
  "a full page starting at <!DOCTYPE html>, styles inlined in a <style> tag, no external " +
  "assets, no markdown fences, no commentary before or after the markup.";

export async function writeHtml(
  prompt: string,
  client: HtmlWriterClient = createHtmlWriterClient(),
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  return extractHtmlDocument(response.content);
}
// #endregion request

// #region extract
export function extractHtmlDocument(
  blocks: ReadonlyArray<{ type: string; text?: string }>,
): string {
  const block = blocks.find((candidate) => candidate.type === "text" && candidate.text);
  if (!block?.text) {
    throw new Error("Claude returned no text block to publish");
  }
  return block.text.trim();
}

export function slugify(prompt: string): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  return slug || "page";
}
// #endregion extract
