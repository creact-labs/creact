import type Anthropic from "@creact-labs/example-mock-anthropic";
import type { HtmlWriterClient } from "../index";

export interface MockHtmlWriterClient {
  client: HtmlWriterClient;
  requests: Anthropic.MessageCreateParamsNonStreaming[];
}

export function createMockHtmlWriterClient(
  blocks: Array<{ type: string; text?: string }>,
): MockHtmlWriterClient {
  const requests: Anthropic.MessageCreateParamsNonStreaming[] = [];
  return {
    requests,
    client: {
      messages: {
        create: async (request) => {
          requests.push(request);
          return { content: blocks };
        },
      },
    },
  };
}
