# integrations

Real-world integration recipes, one module per docs guide: HTTP channels,
AI generation, file-system resources, environment-driven configuration,
testing patterns, and S3 publishing. The entry composes them into a small
pipeline: accept a prompt over HTTP, generate HTML, write it to disk.

## Run

```bash
npm install
cp .env.example .env   # fill in real values to wire live services
npx creact index.tsx
```

External SDK clients (Anthropic, AWS, Hono) are modeled with local
stand-ins shaped like the real ones, so the recipes compile and run
without accounts. Replace a stand-in with the real client and the matching
env vars below become live credentials.
