// #region server
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { useAsyncOutput } from "@creact-labs/creact";

export interface HttpChannelProps {
  port: number;
  onCreatePage: (prompt: string) => { slug: string; state: string };
  onListPages: () => unknown;
}

export function HttpChannel(props: HttpChannelProps) {
  useAsyncOutput<{ url: string; status: string }, { port: number }>({ port: props.port }, async ({ port }, setOutputs) => {
    const server = createServer((request, response) => void handleRequest(request, response, props));
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, () => resolve());
    });
    setOutputs({ url: `http://localhost:${port}`, status: "listening" });
    console.log(`[page-writer] POST prompts to http://localhost:${port}/pages`);
    return () => closeServer(server);
  });
  return <></>;
}
// #endregion server

// #region routes
async function handleRequest(request: IncomingMessage, response: ServerResponse, props: HttpChannelProps): Promise<void> {
  if (request.method === "POST" && request.url === "/pages") return createPage(request, response, props);
  if (request.method === "GET" && request.url === "/pages") return respond(response, 200, props.onListPages());
  respond(response, 404, { error: `no route for ${request.method} ${request.url}` });
}

async function createPage(request: IncomingMessage, response: ServerResponse, props: HttpChannelProps): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  let prompt: unknown;
  try {
    prompt = (JSON.parse(Buffer.concat(chunks).toString("utf8")) as { prompt?: unknown }).prompt;
  } catch {
    return respond(response, 400, { error: "body must be valid JSON" });
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return respond(response, 400, { error: 'expected a body like {"prompt": "a page about..."}' });
  }
  respond(response, 202, props.onCreatePage(prompt.trim()));
}
// #endregion routes

// #region teardown
function respond(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}
// #endregion teardown
