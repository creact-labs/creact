import { resolve } from "node:path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

// The site's version is this package's own version — npm exposes it as
// npm_package_version to the build script, so there is no cross-package
// reach. The commit is the deploying SHA in CI, letting the footer point at
// the exact build behind the live site for rollbacks.
const version = process.env.npm_package_version ?? "0.0.0";
const commit = (process.env.GITHUB_SHA ?? "dev").slice(0, 7);

export default defineConfig({
  plugins: [solidPlugin()],
  base: "/creact/",
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    target: "esnext",
    outDir: "dist",
  },
});
