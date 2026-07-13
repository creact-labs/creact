# hero-fleet

AI-driven site generator fleet — the CReact app shown on the landing page.
An HTTP channel accepts prompts, an AI boundary turns them into HTML, and
each generated site deploys as its own durable resource.

## Run

```bash
npm install
cp .env.example .env   # fill in real values to wire live services
npx creact index.tsx
```

The AI and cloud clients are modeled with local stand-ins, so the app runs
end to end without external accounts. Swap them for real SDK clients and
the env vars below become live credentials.
