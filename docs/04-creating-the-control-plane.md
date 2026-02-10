# Chapter 4: Creating the Control Plane

This chapter adds an HTTP API that accepts requests at runtime, manages multiple sites, and deploys each to its own S3 bucket — all controllable via curl.

---

## Prerequisites

You'll need:

- The project from Chapter 3
- Hono (a lightweight HTTP framework)

Install the new dependencies:

```bash
npm install hono @hono/node-server
```

---

## Step 1: The HTTP API

Create the routes that handle site management.

Create `src/server/routes.ts`.

Two read-only endpoints. Each route takes a callback, keeping HTTP separate from application logic:

```tsx
import type { Context } from "hono";

export function status(c: Context) {
  return c.json({ status: "ok" });
}

export function list(
  c: Context,
  onList?: () => Array<{ id: string; path: string; url?: string }>,
) {
  const sites = onList?.() ?? [];
  return c.json({ sites });
}
```

The write endpoints parse a JSON body and delegate to a callback that returns a Promise:

```tsx
export async function generate(
  c: Context,
  onGenerate?: (
    prompt: string,
  ) => Promise<{ id: string; path: string; url: string }>,
) {
  try {
    const body = await c.req.json();
    const prompt = body?.prompt;
    if (!prompt) {
      return c.json({ error: "prompt required" }, 400);
    }
    const result = await onGenerate?.(prompt);
    return c.json({ status: "complete", ...result });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
}

export async function update(
  c: Context,
  onUpdate?: (id: string, prompt: string) => Promise<{ url: string }>,
) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const prompt = body?.prompt;
    if (!id) {
      return c.json({ error: "id required" }, 400);
    }
    if (!prompt) {
      return c.json({ error: "prompt required" }, 400);
    }
    const result = await onUpdate?.(id, prompt);
    return c.json({ status: "complete", id, ...result });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
}
```

Teardown. One endpoint deletes a single site, the other deletes all of them:

```tsx
export async function cleanupSite(
  c: Context,
  onCleanup?: (id: string) => Promise<void>,
) {
  try {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "id required" }, 400);
    }
    await onCleanup?.(id);
    return c.json({ status: "complete", id });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
}

export async function cleanupAll(c: Context, onCleanup?: () => Promise<void>) {
  try {
    await onCleanup?.();
    return c.json({ status: "complete" });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
}
```

Create `src/server/index.ts`:

```tsx
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

import {
  status,
  list,
  generate,
  update,
  cleanupSite,
  cleanupAll,
} from "./routes";

export interface ServerOptions {
  port: number;
  onList?: () => Array<{ id: string; path: string; url?: string }>;
  onGenerate?: (
    prompt: string,
  ) => Promise<{ id: string; path: string; url: string }>;
  onUpdate?: (id: string, prompt: string) => Promise<{ url: string }>;
  onCleanupSite?: (id: string) => Promise<void>;
  onCleanupAll?: () => Promise<void>;
}

export function startServer(options: ServerOptions) {
  const app = new Hono();

  app.use("/*", cors());

  app.get("/status", status);
  app.get("/list", (c) => list(c, options.onList));
  app.post("/generate", (c) => generate(c, options.onGenerate));
  app.post("/update/:id", (c) => update(c, options.onUpdate));
  app.post("/cleanup/:id", (c) => cleanupSite(c, options.onCleanupSite));
  app.post("/cleanup", (c) => cleanupAll(c, options.onCleanupAll));

  const server = serve({ fetch: app.fetch, port: options.port });

  return server;
}
```

Five endpoints: list, generate, update, delete one, delete all. Each route delegates to a callback so the HTTP layer knows nothing about CReact.

---

## Step 2: Lifecycle Hooks

Create `src/components/channel.tsx`:

```tsx
import { onMount, onCleanup } from "@creact-labs/creact";

import { startServer } from "../server";

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
  let server: ReturnType<typeof startServer>;

  onMount(() => {
    server = startServer({
      port,
      onList: props.onList,
      onGenerate: props.onGenerate,
      onUpdate: props.onUpdate,
      onCleanupSite: props.onCleanupSite,
      onCleanupAll: props.onCleanupAll,
    });

    console.log(`Channel running: http://localhost:${port}`);
  });

  onCleanup(() => server?.close());

  return <></>;
}
```

`onMount` fires when a component first renders. `onCleanup` fires when it's removed. Channel uses both to start the API server and shut it down.

---

## Step 3: Decomposing WebSite

The WebSite component from Chapter 3 handled bucket creation, uploads, and cleanup in one handler. Multiple sites need reusable pieces.

Create `src/components/bucket.tsx`.

```tsx
import {
  useAsyncOutput,
  createEffect,
  createSignal,
  untrack,
  Show,
  access,
  type CReactNode,
  type MaybeAccessor,
} from "@creact-labs/creact";
import type { S3Client } from "@aws-sdk/client-s3";

import {
  createBucket,
  deleteBucket,
  tagBucket,
  configureBucketAsWebsite,
  makeBucketPublic,
} from "../aws";

interface BucketProps {
  s3: S3Client;
  name: MaybeAccessor<string>;
  tags?: Record<string, string>;
  website?: boolean;
  onReady?: () => void;
  children?: CReactNode;
}
```

The handler creates the bucket, tags it, and configures it as a website. The idempotency guard at the top checks persisted state: if the bucket already exists from a previous run, the handler returns early. The returned async function is the cleanup — it runs when the component unmounts.

```tsx
export function Bucket(props: BucketProps) {
  const bucket = useAsyncOutput(
    () => ({ name: access(props.name), tags: props.tags, website: props.website }),
    async (asyncProps, setOutputs) => {
      let isCreated = false;
      setOutputs(prev => {
        isCreated = prev?.status === 'ready';
        return isCreated ? prev : { status: 'creating' };
      });
      if (isCreated) return;

      console.log(`Bucket: creating ${asyncProps.name}`);
      await createBucket(props.s3, asyncProps.name);

      if (asyncProps.tags) {
        await tagBucket(props.s3, asyncProps.name, asyncProps.tags);
      }

      if (asyncProps.website) {
        await configureBucketAsWebsite(props.s3, asyncProps.name);
        await makeBucketPublic(props.s3, asyncProps.name);
      }

      console.log(`Bucket: ready ${asyncProps.name}`);
      setOutputs({ status: 'ready' });

      return async () => {
        console.log(`Bucket: deleting ${asyncProps.name}`);
        await deleteBucket(props.s3, asyncProps.name);
        console.log(`Bucket: deleted ${asyncProps.name}`);
      };
    },
  );
```

`Show` gates children on bucket status — you can't upload to a bucket that doesn't exist yet. The `onReady` callback uses a `reported` signal to fire exactly once:

```tsx
  const [reported, setReported] = createSignal(false);

  createEffect(() => {
    if (bucket.status() === 'ready') {
      const alreadyReported = untrack(() => reported());
      if (alreadyReported) return;

      setReported(true);
      props.onReady?.();
    }
  });

  return (
    <Show when={() => bucket.status() === 'ready'}>
      {props.children}
    </Show>
  );
}
```

Create `src/components/s3-file.tsx`.

S3File tracks a content hash. When content changes, the hash changes, and the handler re-uploads:

```tsx
import { useAsyncOutput, createEffect, createSignal, untrack, access, type MaybeAccessor, onMount } from '@creact-labs/creact';
import { createHash } from 'crypto';
import type { S3Client } from '@aws-sdk/client-s3';

import { uploadObject, deleteObject } from '../aws';

interface S3FileProps {
  s3: S3Client;
  bucket: MaybeAccessor<string>;
  objectKey: string;
  content: MaybeAccessor<string>;
  contentType?: string;
  onUploaded?: () => void;
}

export function S3File(props: S3FileProps) {
  onMount(() => {
    console.log('S3File: mounting', access(props.bucket), props.objectKey);
  })
  const contentHash = () => createHash('md5').update(access(props.content)).digest('hex');

  const file = useAsyncOutput(
    () => ({ bucket: access(props.bucket), objectKey: props.objectKey, hash: contentHash() }),
    async (asyncProps, setOutputs) => {
      let isUploaded = false;
      setOutputs(prev => {
        isUploaded = prev?.status === 'uploaded' && prev?.hash === asyncProps.hash;
        return isUploaded ? prev : { status: 'pending' };
      });
      if (isUploaded) return;

      console.log(`S3: uploading ${asyncProps.objectKey}`);
      const content = access(props.content);
      await uploadObject(props.s3, access(props.bucket), asyncProps.objectKey, content, props.contentType ?? 'text/html');
      console.log(`S3: uploaded ${asyncProps.objectKey}`);

      setOutputs({ status: 'uploaded', hash: asyncProps.hash });

      return async () => {
        console.log(`S3: deleting ${asyncProps.objectKey}`);
        await deleteObject(props.s3, asyncProps.bucket, asyncProps.objectKey);
        console.log(`S3: deleted ${asyncProps.objectKey}`);
      };
    },
  );
```

The dedup effect prevents calling `onUploaded` twice for the same content. It compares the current hash against the last reported one:

```tsx
  const [lastReportedHash, setLastReportedHash] = createSignal<string>('');

  createEffect(() => {
    const status = file.status();
    const hash = file.hash() as string | undefined;

    if (status === 'uploaded' && hash) {
      const last = untrack(() => lastReportedHash());
      if (hash === last) return;

      setLastReportedHash(hash);
      props.onUploaded?.();
    }
  });

  return <></>;
}
```

Now update `src/components/website.tsx` to compose these pieces. Each site gets a unique bucket name derived from a hash of its path, avoiding collisions and keeping names deterministic across restarts:

```tsx
import { createHash } from "crypto";
import { createMemo, access, type MaybeAccessor } from "@creact-labs/creact";

import { useS3, useAWSTags, useAWSRegion, useAWSAccountId } from "./aws";
import { Bucket } from "./bucket";
import { S3File } from "./s3-file";
import { STACK_NAME } from "../../index";
import { getWebsiteUrl } from "../aws";

interface WebSiteProps {
  name: MaybeAccessor<string>;
  content: MaybeAccessor<string>;
  onDeployed?: (url: string) => void;
}

export function WebSite(props: WebSiteProps) {
  const s3 = useS3();
  const tags = useAWSTags();
  const region = useAWSRegion();
  const accountId = useAWSAccountId();

  const siteId = createMemo(() =>
    createHash("sha256").update(access(props.name)).digest("hex").slice(0, 8),
  );
  const bucketName = createMemo(() => `${accountId}-${STACK_NAME}-${siteId()}`);
  const url = createMemo(() => getWebsiteUrl(bucketName(), region));

  const handleUploaded = () => {
    console.log(`Website deployed: ${url()}`);
    props.onDeployed?.(url());
  };

  return (
    <Bucket
      key={siteId()}
      s3={s3}
      name={() => bucketName()}
      tags={tags}
      website
    >
      <S3File
        key="index.html"
        s3={s3}
        bucket={() => bucketName()}
        objectKey="index.html"
        content={() => access(props.content)}
        onUploaded={handleUploaded}
      />
    </Bucket>
  );
}
```

The `key` prop tells CReact which instance is which. When a key changes, CReact unmounts the old component (triggering cleanup) and mounts a new one.

---

## Step 4: Updated File Components

Add a delete utility. Create `src/fs/delete.ts`:

```tsx
import { rmSync } from "fs";

export function deleteFolder(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
```

Update `src/fs/index.ts`:

```tsx
export * from "./delete";
export * from "./read";
export * from "./write";
```

Update `src/components/read.tsx` to use render props with a signal:

```tsx
import {
  createSignal,
  type Accessor,
  type CReactNode,
} from "@creact-labs/creact";
import { existsSync } from "fs";
import { join } from "path";
import { readFile } from "../fs";

interface ReadProps {
  path: string;
  file: string;
  children: (content: Accessor<string>) => CReactNode;
}

export function Read(props: ReadProps) {
  const [content, setContent] = createSignal("");

  const filePath = join(props.path, props.file);
  if (existsSync(filePath)) {
    const fileContent = readFile(props.path, props.file);
    setContent(fileContent);
  }

  return <>{props.children(content)}</>;
}
```

Read now passes an accessor to its children, giving child components a signal they can track reactively.

Create `src/components/write.tsx`:

```tsx
import {
  createEffect,
  createSignal,
  untrack,
  access,
  type MaybeAccessor,
} from "@creact-labs/creact";
import { writeFile } from "../fs";

interface WriteProps {
  path: string;
  file: string;
  content: MaybeAccessor<string>;
  onWritten?: (filePath: string) => void;
}

export function Write(props: WriteProps) {
  const [lastWritten, setLastWritten] = createSignal("");

  createEffect(() => {
    const content = access(props.content);
    if (!content) return;

    const last = untrack(() => lastWritten());
    if (content === last) return;

    setLastWritten(content);
    const filePath = writeFile(props.path, props.file, content);
    console.log(`File written: ${filePath}`);
    props.onWritten?.(filePath);
  });

  return <></>;
}
```

`untrack(() => lastWritten())` reads the previous value without creating a dependency. Without it, updating `lastWritten` would re-trigger the effect that just set it — an infinite loop.

Update `src/components/generate-html.tsx`:

```tsx
import {
  createEffect,
  createSignal,
  untrack,
  access,
  type MaybeAccessor,
  type Accessor,
} from "@creact-labs/creact";

import { useComplete } from "./claude";

const SYSTEM_PROMPT = `You are an HTML generator. You will be given the current HTML content and a description of changes to make.

Your task is to generate the updated HTML based on the requested changes.

Rules:
- Output ONLY the HTML content, no markdown code blocks or explanations
- Preserve the existing structure unless explicitly asked to change it
- Keep the HTML clean and well-formatted
- If no current HTML exists, create a new HTML document from scratch`;

interface GenerateHtmlProps {
  existingContent: Accessor<string>;
  prompt: MaybeAccessor<string>;
  onGenerated: (content: string) => void;
}
```

Same `untrack` pattern as Write — generation runs exactly once per new prompt value:

```tsx
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
      try {
        const existing = props.existingContent();
        console.log("Generate: generating");

        const userPrompt = existing
          ? `Current HTML:\n\`\`\`html\n${existing}\n\`\`\`\n\nRequested changes: ${prompt}`
          : `Create a new HTML document: ${prompt}`;

        const html = await complete({
          system: SYSTEM_PROMPT,
          prompt: userPrompt,
        });

        console.log("Generate: complete");
        props.onGenerated(html);
      } catch (err) {
        console.error("Generate: error", err);
      }
    })();
  });

  return <></>;
}
```

---

## Step 5: Multi-Site State

The `useSites` hook bridges HTTP and CReact's reactive system.

Create `src/hooks/useSites.ts`.

A site has an id, path, content, prompt, and optional URL. The hook returns handlers for each API endpoint plus coordination functions:

```tsx
import { createSignal, type Accessor, type Setter } from "@creact-labs/creact";
import { randomUUID } from "crypto";

export interface SiteConfig {
  id: string;
  path: string;
  content: string;
  prompt: string;
  url?: string;
}

interface PendingOperation {
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

export interface UseSitesReturn {
  shouldCleanup: Accessor<boolean>;
  pendingGeneration: Accessor<SiteConfig | null>;

  handleList: () => Array<{ id: string; path: string; url?: string }>;
  handleGenerate: (
    prompt: string,
  ) => Promise<{ id: string; path: string; url: string }>;
  handleUpdate: (id: string, prompt: string) => Promise<{ url: string }>;
  handleCleanupSite: (id: string) => Promise<void>;
  handleCleanupAll: () => Promise<void>;

  updateSiteContent: (id: string, content: string) => void;
  onDeployed: (id: string, url: string) => void;
  onCleanupComplete: () => void;
  clearPendingGeneration: () => void;
}
```

HTTP expects a response. The reactive pipeline takes time. `handleGenerate` creates a Promise, stores its resolve/reject in a Map, adds the site to the signal, and waits. When the pipeline finishes deploying, `onDeployed` resolves the stored Promise with the URL. Concurrent generation is rejected because the generation pipeline (`Show when={pendingGeneration()}`) renders a single component — a second request would overwrite the first:

```tsx
export function useSites(
  sites: Accessor<SiteConfig[]>,
  setSites: Setter<SiteConfig[]>
): UseSitesReturn {
  const [shouldCleanup, setShouldCleanup] = createSignal(false);
  const [pendingGeneration, setPendingGeneration] = createSignal<SiteConfig | null>(null);

  const pendingOps = new Map<string, PendingOperation>();

  function handleList(): Array<{ id: string; path: string; url?: string }> {
    return sites().map(s => ({ id: s.id, path: s.path, url: s.url }));
  }

  function handleGenerate(prompt: string): Promise<{ id: string; path: string; url: string }> {
    if (pendingGeneration()) {
      return Promise.reject(new Error('Generation already in progress. Please wait for the current generation to complete.'));
    }

    const id = randomUUID().slice(0, 8);
    const path = `./resources/websites/site-${id}`;
    const site = { id, path, content: '', prompt };

    return new Promise((resolve, reject) => {
      pendingOps.set(id, { resolve, reject });
      setSites(prev => [...prev, site]);
      setPendingGeneration(site);
    });
  }

  function handleUpdate(id: string, prompt: string): Promise<{ url: string }> {
    if (pendingGeneration()) {
      return Promise.reject(new Error('Generation already in progress. Please wait for the current generation to complete.'));
    }

    const site = sites().find(s => s.id === id);
    if (!site) {
      return Promise.reject(new Error(`Site not found: ${id}`));
    }

    const updatedSite = { ...site, prompt };

    return new Promise((resolve, reject) => {
      pendingOps.set(id, { resolve, reject });
      setSites(prev => prev.map(s =>
        s.id === id ? updatedSite : s
      ));
      setPendingGeneration(updatedSite);
    });
  }
```

Removing a site from the signal is enough. CReact sees the missing item, unmounts its WebSite, and the component's cleanup function deletes the S3 resources:

```tsx
function handleCleanupSite(id: string): Promise<void> {
  const site = sites().find((s) => s.id === id);
  if (!site) {
    return Promise.reject(new Error(`Site not found: ${id}`));
  }

  setSites((prev) => prev.filter((s) => s.id !== id));
  return Promise.resolve();
}

function handleCleanupAll(): Promise<void> {
  return new Promise((resolve, reject) => {
    pendingOps.set("cleanup:all", { resolve, reject });
    setShouldCleanup(true);
  });
}
```

These callbacks close the loop between the HTTP handlers and the reactive pipeline. `updateSiteContent` pushes generated HTML into the sites signal. `onDeployed` resolves the pending Promise so the HTTP response can return:

```tsx
function updateSiteContent(id: string, content: string) {
  setSites((prev) => {
    const site = prev.find((s) => s.id === id);
    if (!site || site.content === content) {
      return prev;
    }
    return prev.map((s) => (s.id === id ? { ...s, content } : s));
  });
}

function onDeployed(id: string, url: string) {
  setSites((prev) => prev.map((s) => (s.id === id ? { ...s, url } : s)));

  const site = sites().find((s) => s.id === id);
  const op = pendingOps.get(id);
  if (op && site) {
    op.resolve({ id, path: site.path, url });
    pendingOps.delete(id);
  }
}
```

`onCleanupComplete` resets state after a full cleanup. `clearPendingGeneration` tears down the generation pipeline so the next request can proceed:

```tsx
  function onCleanupComplete() {
    setSites([]);
    setShouldCleanup(false);
    const op = pendingOps.get('cleanup:all');
    if (op) {
      op.resolve(undefined);
      pendingOps.delete('cleanup:all');
    }
  }

  function clearPendingGeneration() {
    setPendingGeneration(null);
  }

  return {
    shouldCleanup,
    pendingGeneration,
    handleList,
    handleGenerate,
    handleUpdate,
    handleCleanupSite,
    handleCleanupAll,
    updateSiteContent,
    onDeployed,
    onCleanupComplete,
    clearPendingGeneration,
  };
}
```

Create `src/hooks/index.ts`:

```tsx
export { useSites } from "./useSites";
export type { SiteConfig, UseSitesReturn } from "./useSites";
```

---

## Step 6: Updated AWS Provider

Update `src/components/aws.tsx` so cleanup is controlled reactively instead of by an environment variable.

The interface changes: `shouldCleanup` is now a `MaybeAccessor<boolean>` instead of a static value. `access()` unwraps it whether it's a plain boolean or an accessor function:

```tsx
interface AWSProps {
  region?: string;
  shouldCleanup?: MaybeAccessor<boolean>;
  onCleanupComplete?: () => void;
  children: CReactNode;
}
```

The `Show` flips between children and cleanup based on the reactive prop:

```tsx
<Show
  when={() => !access(props.shouldCleanup)}
  fallback={<Cleanup key="cleanup" onComplete={props.onCleanupComplete} />}
>
  {props.children}
</Show>
```

The `Cleanup` component now calls `onComplete` when finished, so the caller knows when resources are gone. A `reported` signal prevents duplicate side effects:

```tsx
interface CleanupProps {
  onComplete?: () => void;
}

export function Cleanup(props: CleanupProps) {
  const s3 = useS3();
  const region = useAWSRegion();
  const tags = useAWSTags();

  const cleanup = useAsyncOutput(
    { region, tags },
    async (asyncProps, setOutputs) => {
      let isComplete = false;
      setOutputs((prev) => {
        isComplete = prev?.status === "complete";
        return isComplete ? prev : { status: "pending" };
      });
      if (isComplete) return;

      setOutputs({ status: "finding_resources" });

      const deleted = await cleanupBuckets(
        s3,
        asyncProps.region,
        asyncProps.tags,
      );

      setOutputs({ status: "complete", deleted });
    },
  );

  const [reported, setReported] = createSignal(false);

  createEffect(() => {
    const status = cleanup.status() ?? "pending";
    const deleted = cleanup.deleted() as string[] | undefined;

    if (status === "complete") {
      const alreadyReported = untrack(() => reported());
      if (alreadyReported) return;

      setReported(true);
      if (deleted && deleted.length > 0) {
        console.log(`Cleanup complete. Deleted: ${deleted.join(", ")}`);
      } else {
        console.log("Cleanup complete. Nothing to delete.");
      }
      props.onComplete?.();
    } else if (status !== "pending") {
      console.log(`Cleanup status: ${status}`);
    }
  });

  return <></>;
}
```

The rest of the file (context hooks, account ID fetching, `useS3`, `useAWSTags`, `useAWSRegion`, `useAWSAccountId`) stays the same as Chapter 2.

---

## Step 7: Wire It Up

Update `src/app.tsx`.

Persistence saves the sites array whenever it changes. On restart, `setOutputs(prev => ...)` receives the previously saved sites and writes them back into the signal. The `initialized` flag prevents the first reactive update from overwriting restored data:

```tsx
import { Show, For, createSignal, useAsyncOutput } from '@creact-labs/creact';

import { AWS } from './components/aws';
import { Channel } from './components/channel';
import { Claude } from './components/claude';
import { GenerateHtml } from './components/generate-html';
import { Read } from './components/read';
import { WebSite } from './components/website';
import { Write } from './components/write';
import { useSites, type SiteConfig } from './hooks';

export function App() {
  const [sites, setSites] = createSignal<SiteConfig[]>([]);
  const [initialized, setInitialized] = createSignal(false);

  const persistence = useAsyncOutput<{ sites: SiteConfig[] }>(
    () => ({ sites: sites() }),
    async (props, setOutputs) => {
      setOutputs(prev => {
        if (!initialized() && prev?.sites && prev.sites.length > 0) {
          setSites(prev.sites);
          setInitialized(true);
          return prev;
        }
        setInitialized(true);
        return { sites: props.sites };
      });
    }
  );
```

The `useSites` hook destructured here:

```tsx
const {
  shouldCleanup,
  pendingGeneration,
  handleList,
  handleGenerate,
  handleUpdate,
  handleCleanupSite,
  handleCleanupAll,
  updateSiteContent,
  onDeployed,
  onCleanupComplete,
  clearPendingGeneration,
} = useSites(sites, setSites);
```

Channel mounts the API server immediately. When `pendingGeneration()` becomes non-null, `Show` renders the generation pipeline: Read loads existing HTML, GenerateHtml sends it to Claude, Write saves the result. After writing, `updateSiteContent` pushes the HTML into the sites signal and `clearPendingGeneration` tears down the pipeline:

```tsx
  return (
    <>
      <Channel
        port={3000}
        onList={handleList}
        onGenerate={handleGenerate}
        onUpdate={handleUpdate}
        onCleanupSite={handleCleanupSite}
        onCleanupAll={handleCleanupAll}
      />

      <Claude>
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
                        clearPendingGeneration();
                      }}
                    />
                  )}
                </Show>
              </>
            );
          }}
        </Show>
      </Claude>
```

`For` renders one WebSite per site. `keyFn` identifies each item across renders. When a site leaves the array, CReact unmounts its WebSite and triggers cleanup. When a new site appears, CReact mounts a fresh one:

```tsx
      <AWS
        key="aws"
        region="us-east-1"
        shouldCleanup={() => shouldCleanup()}
        onCleanupComplete={onCleanupComplete}
      >
        <For each={() => sites()} keyFn={(s) => s.id}>
          {(site) => {
            const id = site().id;
            return (
              <Show when={() => site().content}>
                {() => (
                  <WebSite
                    name={() => site().path}
                    content={() => site().content}
                    onDeployed={(url) => onDeployed(id, url)}
                  />
                )}
              </Show>
            );
          }}
        </For>
      </AWS>
    </>
  );
}
```

---

## See It In Action

Run your app:

```bash
npm run dev
```

You'll see:

```
Channel running: http://localhost:3000
```

Generate a site:

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A landing page for a coffee shop"}'
```

The terminal will show:

```
Generate: generating
Generate: complete
File written: resources/websites/site-a1b2c3d4/index.html
Bucket: creating xxx-my-app-a1b2c3d4
Bucket: ready xxx-my-app-a1b2c3d4
S3File: mounting xxx-my-app-a1b2c3d4 index.html
S3: uploading index.html
S3: uploaded index.html
Website deployed: http://xxx-my-app-a1b2c3d4.s3-website-us-east-1.amazonaws.com
```

Try the other endpoints:

```bash
# List all sites
curl http://localhost:3000/list

# Update an existing site
curl -X POST http://localhost:3000/update/a1b2c3d4 \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Add a contact form"}'

# Delete a specific site
curl -X POST http://localhost:3000/cleanup/a1b2c3d4

# Delete all sites
curl -X POST http://localhost:3000/cleanup
```

Stop the app with Ctrl+C and restart it. Your sites are still there, restored from the persisted state.

---

## Project Structure

```
my-app/
├── index.tsx
├── src/
│   ├── memory.ts
│   ├── app.tsx
│   ├── components/
│   │   ├── aws.tsx
│   │   ├── bucket.tsx
│   │   ├── channel.tsx
│   │   ├── claude.tsx
│   │   ├── generate-html.tsx
│   │   ├── read.tsx
│   │   ├── s3-file.tsx
│   │   ├── website.tsx
│   │   └── write.tsx
│   ├── hooks/
│   │   ├── index.ts
│   │   └── useSites.ts
│   ├── server/
│   │   ├── index.ts
│   │   └── routes.ts
│   ├── aws/
│   │   ├── index.ts
│   │   ├── identity.ts
│   │   ├── bucket.ts
│   │   ├── object.ts
│   │   └── cleanup.ts
│   └── fs/
│       ├── index.ts
│       ├── read.ts
│       ├── write.ts
│       └── delete.ts
├── .env
├── package.json
└── tsconfig.json
```

---

## What Just Happened?

You built a control plane that:

1. **Accepts requests at runtime** — an HTTP API generates, updates, and deletes sites without restarting
2. **Manages multiple sites** — each site gets its own S3 bucket, created and destroyed by CReact's component lifecycle
3. **Persists across restarts** — `useAsyncOutput` saves and restores the full site array
4. **Bridges HTTP and reactivity** — Promises in the hook resolve when CReact's reactive pipeline finishes deploying

The entire system is controllable via curl. [Chapter 5](./05-giving-it-a-pretty-face.md) puts a browser-based admin dashboard on top.
