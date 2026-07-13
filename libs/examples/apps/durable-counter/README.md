# durable-counter

A counter that survives restarts — the canonical first CReact app. Boot it,
kill it, boot it again: the count picks up where it left off, restored from
the file-backed Memory ledger in `./.state`.

## Run

```bash
npm install
npx creact index.tsx
```

No configuration needed. Delete `./.state` to start the counter over.
