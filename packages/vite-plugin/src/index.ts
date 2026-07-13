import type { Plugin } from "vite";

const DEFAULT_JSX_IMPORT_SOURCE = "@creact-labs/creact";

export interface CReactPluginOptions {
  /**
   * JSX import source used to compile `.tsx` files. Defaults to
   * `@creact-labs/creact`, so components resolve the CReact runtime with no
   * tsconfig changes.
   */
  jsxImportSource?: string;
}

/**
 * Configures Vite (and Vitest, which shares the transform pipeline) to build
 * CReact projects: JSX compiles against the CReact runtime, and that runtime
 * is bundled rather than externalized when the app runs through Vite's SSR
 * loader. One line in `vite.config.ts` replaces the hand-written
 * `jsx`/`jsxImportSource` tsconfig block.
 */
export function creact(options: CReactPluginOptions = {}): Plugin {
  const jsxImportSource = options.jsxImportSource ?? DEFAULT_JSX_IMPORT_SOURCE;
  return {
    name: "@creact-labs/vite-plugin",
    config() {
      return {
        esbuild: {
          jsx: "automatic",
          jsxImportSource,
        },
        ssr: {
          noExternal: [jsxImportSource],
        },
      };
    },
  };
}

export default creact;
