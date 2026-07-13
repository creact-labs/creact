/**
 * Samples for the HTTP APIs guide. Hono-shaped stand-ins keep the channel
 * compiling without the dependency; in a real project:
 * `npm install hono @hono/node-server`.
 */
import { createSignal, For, onCleanup, onMount, Show } from "@creact-labs/creact";
import { randomUUID } from "crypto";
import { WebSite } from "./aws-integration";

export interface SiteConfig {
  id: string;
  path: string;
  content: string;
  prompt: string;
  url?: string;
}

interface HonoContext {
  req: {
    json: () => Promise<{ prompt: string }>;
    param: (name: string) => string;
  };
  json: (body: unknown) => Response;
}

type HonoHandler = (c: HonoContext) => Response | Promise<Response>;

/** Hono-shaped stand-in; swap for the real `hono` package */
class Hono {
  fetch = async (_request: Request): Promise<Response> => new Response();
  use(_path: string, _middleware: unknown): void {}
  get(_path: string, _handler: HonoHandler): void {}
  post(_path: string, _handler: HonoHandler): void {}
}

/** Stand-in for `hono/cors` */
function cors(): unknown {
  return {};
}

/** Stand-in for `@hono/node-server` */
function serve(_options: {
  fetch: (request: Request) => Promise<Response>;
  port: number;
}) {
  return {
    close(): void {},
  };
}

// #region channel
interface ChannelProps {
  port?: number;
  onList?: () => Array<{ id: string; path: string; url?: string }>;
  onGenerate?: (
    prompt: string,
  ) => Promise<{ id: string; path: string; url: string }>;
  onUpdate?: (id: string, prompt: string) => Promise<{ url: string }>;
  onCleanupSite?: (id: string) => Promise<void>;
  onCleanupAll?: () => Promise<void>;
}

export function Channel(props: ChannelProps) {
  const port = props.port ?? 3000;
  let server: ReturnType<typeof serve>;

  onMount(() => {
    const app = new Hono();
    app.use("/*", cors());

    app.get("/list", (c) => {
      const sites = props.onList?.() ?? [];
      return c.json({ sites });
    });

    app.post("/generate", async (c) => {
      const { prompt } = await c.req.json();
      const result = await props.onGenerate?.(prompt);
      return c.json({ status: "complete", ...result });
    });

    app.post("/cleanup/:id", async (c) => {
      await props.onCleanupSite?.(c.req.param("id"));
      return c.json({ status: "complete" });
    });

    server = serve({ fetch: app.fetch, port });
    console.log(`Channel running: http://localhost:${port}`);
  });

  onCleanup(() => server?.close());

  return <></>;
}
// #endregion channel

// #region reactive-flow
function App() {
  const [sites, setSites] = createSignal<SiteConfig[]>([]);

  function handleGenerate(prompt: string) {
    const id = randomUUID().slice(0, 8);
    const site = { id, path: `./resources/sites/${id}`, content: "", prompt };
    setSites((prev) => [...prev, site]);
    // Returns a promise resolved later when deployment completes
    return new Promise<{ id: string; path: string; url: string }>(
      (resolve, reject) => {
        /* ... */
      },
    );
  }

  function handleList() {
    return sites().map((s) => ({ id: s.id, path: s.path, url: s.url }));
  }

  return (
    <>
      <Channel
        port={3000}
        onList={handleList}
        onGenerate={handleGenerate}
      />
      <For each={() => sites()} keyFn={(s) => s.id}>
        {(site) => (
          <Show when={() => site().content}>
            {() => (
              <WebSite name={() => site().path} content={() => site().content} />
            )}
          </Show>
        )}
      </For>
    </>
  );
}
// #endregion reactive-flow

export { App };
