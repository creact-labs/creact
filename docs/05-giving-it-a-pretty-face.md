# Chapter 5: Giving It a Pretty Face

The control plane works — you can generate, update, and delete sites via curl. But managing sites from the terminal gets old. This chapter adds a browser-based admin dashboard.

---

## Prerequisites

You'll need:

- The project from Chapter 4

---

## Step 1: Static File Server

Create `src/components/http-server.tsx`. A static file server that serves the admin dashboard:

```tsx
import { onMount, onCleanup } from "@creact-labs/creact";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";

interface HttpServerProps {
  port: number;
  path: string;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};
```

The component creates a Hono app on mount and tears it down on cleanup:

```tsx
export function HttpServer(props: HttpServerProps) {
  let server: ReturnType<typeof serve> | null = null;

  onMount(() => {
    const { port, path } = props;

    const app = new Hono();

    app.get("/*", (c) => {
      const url = c.req.path === "/" ? "/index.html" : c.req.path;
      const filePath = join(path, url);

      if (!existsSync(filePath)) {
        return c.text("Not Found", 404);
      }

      const content = readFileSync(filePath);
      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      return c.body(content, 200, { "Content-Type": contentType });
    });

    server = serve({ fetch: app.fetch, port }, () => {
      console.log(
        `Static server running at http://localhost:${port} serving ${path}`,
      );
    });
  });

  onCleanup(() => {
    if (server) {
      server.close();
      console.log("Static server stopped");
    }
  });

  return <></>;
}
```

Same lifecycle pattern as Channel — `onMount` starts the server, `onCleanup` shuts it down.

---

## Step 2: The Admin UI

Create `resources/admin/index.html`. A single HTML file — Preact and Bootstrap load from CDNs.

The HTML shell and styles:

```html
<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Site Generator</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
body { background: #0a0a0a; }
.site-id { font-family: 'SF Mono', Monaco, monospace; }
</style>
</head>
<body>

<div class="container py-5" style="max-width: 640px;">
  <h1 class="text-secondary text-uppercase small fw-medium mb-4" style="letter-spacing: 0.5px;">Site Generator</h1>
  <div id="app"></div>
</div>

<script type="module">
import { h, render } from "https://esm.sh/preact@10.26.4";
import { useState, useEffect } from "https://esm.sh/preact@10.26.4/hooks";
import htm from "https://esm.sh/htm@3.1.1";

const html = htm.bind(h);
const API = "http://localhost:3000";
```

State and data loading. The `load` function fetches the site list on mount and after every mutation:

```js
function App() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [editing, setEditing] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API}/list`);
      const data = await res.json();
      setSites(data.sites);
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
```

Each action function calls the Channel API and reloads the list:

```js
async function generate(e) {
  e.preventDefault();
  const prompt = e.target.prompt.value;
  setGenerating(true);
  try {
    const res = await fetch(`${API}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    e.target.reset();
    load();
  } catch {
    alert("Failed to generate");
  }
  setGenerating(false);
}

async function update(e) {
  e.preventDefault();
  const prompt = e.target.prompt.value;
  const id = editing;
  setUpdating(true);
  try {
    await fetch(`${API}/update/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    setEditing(null);
    load();
  } catch {
    alert("Failed to update");
  }
  setUpdating(false);
}
```

The delete handlers:

```js
async function del(id) {
  await fetch(`${API}/cleanup/${id}`, { method: "POST" });
  load();
}

async function cleanupAll() {
  if (!confirm("Delete all sites?")) return;
  setCleaning(true);
  try {
    await fetch(`${API}/cleanup`, { method: "POST" });
    load();
  } catch {
    alert("Failed to cleanup");
  }
  setCleaning(false);
}
```

The render return — a generate form at the top, then the site list with loading/error states:

```js
  return html`
    <form class="d-flex gap-2 mb-4" onSubmit=${generate}>
      <input name="prompt" class="form-control" placeholder="Describe your website..." required />
      <button type="submit" class="btn btn-light fw-semibold" disabled=${generating}>
        ${generating ? html`<span class="spinner-border spinner-border-sm"></span>` : "Generate"}
      </button>
    </form>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="text-secondary text-uppercase small fw-medium mb-0">Sites</h2>
      ${sites.length > 0 && html`
        <button class="btn btn-outline-danger btn-sm" onClick=${cleanupAll} disabled=${cleaning}>
          ${cleaning ? "Cleaning..." : "Delete All"}
        </button>
      `}
    </div>

    <div class="border rounded">
      ${loading && html`
        <div class="placeholder-glow p-4 border-bottom"><span class="placeholder col-6"></span></div>
        <div class="placeholder-glow p-4"><span class="placeholder col-6"></span></div>
      `}
      ${!loading && error && html`
        <div class="text-danger text-center p-5">Cannot connect to API</div>
      `}
      ${!loading && !error && sites.length === 0 && html`
        <div class="text-secondary text-center p-5">No sites yet</div>
      `}
```

Each site row shows its ID, URL, and path. The Edit button reveals an inline prompt input:

```js
      ${!loading && !error && sites.map(s => html`
        <div class="p-3 border-bottom">
          <div class="d-flex justify-content-between align-items-center">
            <div class="flex-grow-1 min-width-0">
              <div class="site-id fw-semibold">${s.id}</div>
              ${s.url && html`<a class="text-primary text-break small" href=${s.url} target="_blank">${s.url}</a>`}
              <div class="text-secondary small">${s.path}</div>
            </div>
            <div class="d-flex gap-2 ms-3">
              <button class="btn btn-outline-light btn-sm" onClick=${() => setEditing(editing === s.id ? null : s.id)}>
                ${editing === s.id ? "Cancel" : "Edit"}
              </button>
              <button class="btn btn-outline-danger btn-sm" onClick=${() => del(s.id)}>Delete</button>
            </div>
          </div>
          ${editing === s.id && html`
            <form class="d-flex gap-2 mt-2" onSubmit=${update}>
              <input name="prompt" class="form-control form-control-sm" placeholder="Describe changes..." required />
              <button type="submit" class="btn btn-light btn-sm fw-semibold" disabled=${updating}>
                ${updating ? html`<span class="spinner-border spinner-border-sm"></span>` : "Update"}
              </button>
            </form>
          `}
        </div>
      `)}
    </div>
  `;
}

render(html`<${App} />`, document.getElementById("app"));
```

The closing tags:

```html
</script>
</body>
</html>
```

---

## Step 3: Serve the Dashboard

Update `src/app.tsx` to add HttpServer.

Add the import:

```tsx
import { HttpServer } from "./components/http-server";
```

And add the `<HttpServer>` line right after `<Channel>`:

```tsx
      <Channel
        port={3000}
        onList={handleList}
        onGenerate={handleGenerate}
        onUpdate={handleUpdate}
        onCleanupSite={handleCleanupSite}
        onCleanupAll={handleCleanupAll}
      />

      <HttpServer port={8080} path="./resources/admin" />

      <Claude>
```

That's it — one import and one JSX line. HttpServer mounts alongside Channel and serves the static files from `resources/admin/`.

---

## See It In Action

Run your app:

```bash
npm run dev
```

You'll see:

```
Channel running: http://localhost:3000
Static server running at http://localhost:8080 serving ./resources/admin
```

Open `http://localhost:8080` in your browser. You'll see the admin dashboard.

Type a prompt like "A landing page for a coffee shop" and click Generate. The terminal will show:

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

The admin dashboard updates with the new site and its URL. Generate a few more. Each gets its own bucket.

You can also use curl:

```bash
# List all sites
curl http://localhost:3000/list

# Generate a new site
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A portfolio page for a photographer"}'

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
│   │   ├── http-server.tsx
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
├── resources/
│   └── admin/
│       └── index.html
├── .env
├── package.json
└── tsconfig.json
```

---

## What Just Happened?

Across Chapters 4 and 5, you built an app that:

1. **Accepts requests at runtime** — an HTTP API generates, updates, and deletes sites without restarting
2. **Manages multiple sites** — each site gets its own S3 bucket, created and destroyed by CReact's component lifecycle
3. **Persists across restarts** — `useAsyncOutput` saves and restores the full site array
4. **Bridges HTTP and reactivity** — Promises in the hook resolve when CReact's reactive pipeline finishes deploying

Chapter 4 built the control plane — the HTTP API, site management, AI generation, and AWS deployment. This chapter added the visual layer: a static file server component and a browser-based admin dashboard, wired in with one import and one JSX line.
