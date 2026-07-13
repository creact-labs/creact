import { describe, expect, it } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createPage, handleRequest, type HttpChannelProps } from "../index";

interface Capture { status: number; payload: unknown }

function fakeResponse(capture: Capture): ServerResponse {
  return {
    writeHead: (status: number) => {
      capture.status = status;
    },
    end: (body: string) => {
      capture.payload = JSON.parse(body);
    },
  } as unknown as ServerResponse;
}

function fakeRequest(method: string, url: string, body?: string): IncomingMessage {
  const chunks = body === undefined ? [] : [Buffer.from(body, "utf8")];
  const request = { method, url } as unknown as IncomingMessage;
  (request as unknown as { [Symbol.asyncIterator]: () => AsyncGenerator<Buffer> })[Symbol.asyncIterator] =
    async function* () {
      for (const chunk of chunks) yield chunk;
    };
  return request;
}

function props(overrides?: Partial<HttpChannelProps>): HttpChannelProps {
  return {
    port: 0,
    onCreatePage: (prompt) => ({ slug: prompt.replace(/\s+/g, "-"), state: "writing" }),
    onListPages: () => [{ slug: "a" }],
    ...overrides,
  };
}

describe("handleRequest", () => {
  it("routes POST /pages to createPage", async () => {
    const capture: Capture = { status: 0, payload: undefined };
    await handleRequest(fakeRequest("POST", "/pages", JSON.stringify({ prompt: "a page" })), fakeResponse(capture), props());
    expect(capture.status).toBe(202);
    expect(capture.payload).toEqual({ slug: "a-page", state: "writing" });
  });

  it("routes GET /pages to onListPages", async () => {
    const capture: Capture = { status: 0, payload: undefined };
    await handleRequest(fakeRequest("GET", "/pages"), fakeResponse(capture), props());
    expect(capture.status).toBe(200);
    expect(capture.payload).toEqual([{ slug: "a" }]);
  });

  it("returns 404 for unknown routes", async () => {
    const capture: Capture = { status: 0, payload: undefined };
    await handleRequest(fakeRequest("DELETE", "/nope"), fakeResponse(capture), props());
    expect(capture.status).toBe(404);
    expect(capture.payload).toEqual({ error: "no route for DELETE /nope" });
  });
});

describe("createPage", () => {
  it("accepts a valid prompt with 202", async () => {
    const capture: Capture = { status: 0, payload: undefined };
    await createPage(fakeRequest("POST", "/pages", JSON.stringify({ prompt: "  a bakery  " })), fakeResponse(capture), props());
    expect(capture.status).toBe(202);
    expect(capture.payload).toEqual({ slug: "a-bakery", state: "writing" });
  });

  it("rejects malformed JSON with 400", async () => {
    const capture: Capture = { status: 0, payload: undefined };
    await createPage(fakeRequest("POST", "/pages", "{not json"), fakeResponse(capture), props());
    expect(capture.status).toBe(400);
    expect(capture.payload).toEqual({ error: "body must be valid JSON" });
  });

  it("rejects a non-string prompt with 400", async () => {
    const capture: Capture = { status: 0, payload: undefined };
    await createPage(fakeRequest("POST", "/pages", JSON.stringify({ prompt: 42 })), fakeResponse(capture), props());
    expect(capture.status).toBe(400);
  });

  it("rejects an empty prompt with 400", async () => {
    const capture: Capture = { status: 0, payload: undefined };
    await createPage(fakeRequest("POST", "/pages", JSON.stringify({ prompt: "   " })), fakeResponse(capture), props());
    expect(capture.status).toBe(400);
  });
});
