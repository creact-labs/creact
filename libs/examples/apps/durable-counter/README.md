# durable-counter

A counter that survives restarts — the canonical first CReact app. A single
`useAsyncOutput` resource ticks a count once per second and persists it to a
file-backed Memory ledger under `./.state`. Kill the process, start it again,
and the count resumes where it left off instead of starting over.

## Run

From this directory:

```bash
npm start
```

You'll see the count tick up once per second:

```
Count: 0
Count: 1
Count: 2
```

Stop it with `Ctrl+C`, then run `npm start` again. The counter restores the
last persisted value and keeps counting from there:

```
Count: 3
Count: 4
```

Delete `./.state` to reset the counter to zero.

## Test

From `libs/examples`:

```bash
npx vitest --run apps/durable-counter
```
