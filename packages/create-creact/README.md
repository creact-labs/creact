# create-creact

Scaffold a new [CReact](https://github.com/creact-labs/creact) project in one command.

## Usage

```bash
npm create creact@latest my-app
```

This generates a ready-to-run CReact project in `my-app/`. If you omit the directory
name, it defaults to `creact-app`. The scaffolder refuses to overwrite a directory that
already exists and is not empty.

Then:

```bash
cd my-app
npm install
npm run dev
```

`npm run dev` runs the app in watch mode via `creact --watch index.tsx`. The starter is a
durable counter that increments once a second and survives restarts.

## What you get

- `index.tsx` — a real CReact entry point: a durable counter using `useAsyncOutput`
- `package.json` — dev/start/build/typecheck scripts, CReact + Vite plugin wired up
- `vite.config.ts` — the `@creact-labs/vite-plugin` for zero-config JSX
- `tsconfig.json` — JSX configured for CReact
- `README.md`, `.gitignore`

Learn more at https://github.com/creact-labs/creact.
