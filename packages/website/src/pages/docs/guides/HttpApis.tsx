import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const HttpApis: Component = () => {
  return (
    <>
      <h1>HTTP APIs and Channels</h1>
      <p class="docs-description">
        Build a channel component that exposes HTTP endpoints and feeds input
        into the reactive system.
      </p>

      <DocHeading level={2} id="channels">
        What Are Channels?
      </DocHeading>
      <p>
        A channel is a component that starts an HTTP server on mount and stops
        it on cleanup. Incoming requests call callback props, which update
        signals and trigger downstream components.
      </p>

      <DocHeading level={2} id="http-server">
        Channel Component
      </DocHeading>
      <p>
        The <code>Channel</code> component starts a Hono server inside{" "}
        <code>onMount</code>. Route handlers are passed in as props.{" "}
        <code>onCleanup</code> shuts down the server when the component is
        removed.
      </p>
      <DocCodeBlock
        code={`import { onMount, onCleanup } from '@creact-labs/creact';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

interface ChannelProps {
  port?: number;
  onList?: () => Array<{ id: string; path: string; url?: string }>;
  onGenerate?: (prompt: string) => Promise<{ id: string; path: string; url: string }>;
  onUpdate?: (id: string, prompt: string) => Promise<{ url: string }>;
  onCleanupSite?: (id: string) => Promise<void>;
  onCleanupAll?: () => Promise<void>;
}

export function Channel(props: ChannelProps) {
  const port = props.port ?? 3000;
  let server: ReturnType<typeof serve>;

  onMount(() => {
    const app = new Hono();
    app.use('/*', cors());

    app.get('/list', (c) => {
      const sites = props.onList?.() ?? [];
      return c.json({ sites });
    });

    app.post('/generate', async (c) => {
      const { prompt } = await c.req.json();
      const result = await props.onGenerate?.(prompt);
      return c.json({ status: 'complete', ...result });
    });

    app.post('/cleanup/:id', async (c) => {
      await props.onCleanupSite?.(c.req.param('id'));
      return c.json({ status: 'complete' });
    });

    server = serve({ fetch: app.fetch, port });
    console.log(\`Channel running: http://localhost:\${port}\`);
  });

  onCleanup(() => server?.close());

  return <></>;
}`}
        filename="components/channel.tsx"
      />

      <DocHeading level={2} id="reactive-flow">
        Connecting to the Reactive System
      </DocHeading>
      <p>
        The channel's callback props call <code>setSites</code>,{" "}
        <code>setPendingGeneration</code>, and other setters. Those signal
        updates trigger effects and <code>Show</code>/<code>For</code>
        components downstream.
      </p>
      <DocCodeBlock
        code={`import { createSignal, For, Show } from '@creact-labs/creact';

function App() {
  const [sites, setSites] = createSignal<SiteConfig[]>([]);

  function handleGenerate(prompt: string) {
    const id = randomUUID().slice(0, 8);
    const site = { id, path: \`./resources/sites/\${id}\`, content: '', prompt };
    setSites(prev => [...prev, site]);
    // Returns a promise resolved later when deployment completes
    return new Promise((resolve, reject) => { /* ... */ });
  }

  function handleList() {
    return sites().map(s => ({ id: s.id, path: s.path, url: s.url }));
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
            {() => <WebSite name={() => site().path} content={() => site().content} />}
          </Show>
        )}
      </For>
    </>
  );
}`}
        filename="app.tsx"
      />

      <Callout type="info">
        <p>
          The <code>onCleanup</code> callback releases the port when the
          component is removed or the app stops.
        </p>
      </Callout>
    </>
  );
};

export default HttpApis;
