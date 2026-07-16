import { describe, expect, it } from "vitest";
import { createMockHtmlWriterClient } from "../__mocks__/mock-html-writer-client";
import { extractHtmlDocument, slugify, writeHtml } from "../index";

const document = "<!DOCTYPE html><html><body>Fresh bread daily</body></html>";

describe("writeHtml", () => {
  it("sends the prompt to claude-sonnet-4-6 with the standalone-document system prompt", async () => {
    const { client, requests } = createMockHtmlWriterClient([{ type: "text", text: document }]);

    await writeHtml("a landing page for a sourdough bakery", client);

    expect(requests).toHaveLength(1);
    expect(requests[0].model).toBe("claude-sonnet-4-6");
    expect(requests[0].system).toContain("standalone HTML document");
    expect(requests[0].messages).toEqual([
      { role: "user", content: "a landing page for a sourdough bakery" },
    ]);
  });

  it("extracts the first text block and trims surrounding whitespace", async () => {
    const { client } = createMockHtmlWriterClient([
      { type: "thinking" },
      { type: "text", text: `\n${document}\n` },
    ]);

    await expect(writeHtml("a bakery page", client)).resolves.toBe(document);
  });

  it("rejects when the response carries no text block", async () => {
    const { client } = createMockHtmlWriterClient([{ type: "tool_use" }]);

    await expect(writeHtml("a bakery page", client)).rejects.toThrow(
      "no text block",
    );
  });
});

describe("extractHtmlDocument", () => {
  it("skips text blocks with empty text", () => {
    const blocks = [{ type: "text", text: "" }, { type: "text", text: document }];

    expect(extractHtmlDocument(blocks)).toBe(document);
  });
});

describe("slugify", () => {
  it("turns a prompt into a kebab-case slug", () => {
    expect(slugify("A landing page for Ada's Bakery!")).toBe("a-landing-page-for-ada-s-bakery");
  });

  it("caps slugs at 48 characters without a trailing hyphen", () => {
    const slug = slugify("word ".repeat(20));

    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("falls back to page when nothing survives", () => {
    expect(slugify("!!!")).toBe("page");
  });
});
