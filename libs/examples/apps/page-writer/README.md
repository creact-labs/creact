# page-writer

An HTTP service where Claude writes HTML pages that deploy as durable resources. POST a prompt and the app asks `claude-sonnet-4-6` for a complete standalone HTML document, then deploys it to `./out/<slug>.html` as a managed resource. Every page survives restarts: the ledger in `./.state` remembers what was deployed, so a restarted process rehydrates its pages without calling Claude again.

## Requirements

- Node 18 or newer
- An Anthropic API key

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Authenticates the Anthropic SDK. Required — the app exits with a clear message without it. | none |
| `PORT` | Port for the HTTP server. | `3000` |

Copy `.env.example` to `.env` as a template, then export the variables in your shell:

```bash
cp .env.example .env
export ANTHROPIC_API_KEY=sk-ant-...
```

## Run it

```bash
npm start
```

`npm start` runs `creact --watch index.tsx`: the process stays up serving requests and restarts whenever a source file changes. The server logs `POST prompts to http://localhost:3000/pages` once it is listening.

## Use it

Create a page:

```bash
curl -X POST http://localhost:3000/pages \
  -H 'content-type: application/json' \
  -d '{"prompt": "a landing page for a sourdough bakery"}'
```

The response arrives immediately with the page's slug while Claude writes in the background:

```json
{
  "slug": "a-landing-page-for-a-sourdough-bakery",
  "state": "writing"
}
```

List every page and its deployment state:

```bash
curl http://localhost:3000/pages
```

Each entry reports `state` as `writing`, `ready`, or `failed`, the deployed `file` once ready, and `latest: true` on the most recently requested page that finished deploying.

Malformed JSON bodies return `400`, unknown routes return `404`.

## Where pages land

Generated documents are written to `./out/<slug>.html` — open them straight in a browser. Deployment state lives in `./.state/page-writer.json`. Restart the app and already-written pages come back as `ready` without another Claude call; delete `./.state` to start fresh.
