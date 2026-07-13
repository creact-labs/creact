# create-creact

Scaffold a new [CReact](https://github.com/creact-labs/creact) project in one command.

## Usage

```bash
npm create creact@latest my-app
```

This generates a ready-to-run CReact project in `my-app/`. If you omit the directory
name, it defaults to `creact-app`. The scaffolder refuses to overwrite a directory that
already exists and is not empty.

You are prompted for a memory backend, or pass `--memory=<file|sqlite|memory>`:

| Backend  | Persistence                          |
| -------- | ------------------------------------ |
| `file`   | JSON files under `./.state` (default) |
| `sqlite` | a single `creact.db` (better-sqlite3) |
| `memory` | in-process only, nothing survives     |

Then:

```bash
cd my-app
npm install
npm run dev
```

`npm run dev` runs the app in watch mode via `creact --watch index.tsx`. The starter is a
durable counter that increments once a second and, with a persistent backend, survives
restarts.

## What you get

- `index.tsx` — a real CReact entry point: a durable counter using `useAsyncOutput`
- `memory.ts` — the memory backend you chose
- `package.json` — dev/start/typecheck scripts, CReact wired up
- `tsconfig.json` — JSX configured for CReact
- `README.md`, `.gitignore`

Learn more at https://github.com/creact-labs/creact.
