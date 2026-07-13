# @creact-labs/vite-plugin

Vite plugin for [CReact](https://github.com/creact-labs/creact). It wires JSX
to the CReact runtime, so Vite and Vitest build a CReact project without a
hand-written `jsx`/`jsxImportSource` tsconfig block.

## Install

```bash
npm install -D @creact-labs/vite-plugin vite
```

## Use

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { creact } from "@creact-labs/vite-plugin";

export default defineConfig({
  plugins: [creact()],
});
```

That is the whole configuration. `.tsx` files now compile against
`@creact-labs/creact`, and the runtime is bundled through Vite's SSR loader.

### Options

| Option            | Default                | Description                          |
| ----------------- | ---------------------- | ------------------------------------ |
| `jsxImportSource` | `@creact-labs/creact`  | JSX import source used to compile TSX |

## Scaffold a project

```bash
npm create creact@latest my-app
```

The generated project is already configured with this plugin.
