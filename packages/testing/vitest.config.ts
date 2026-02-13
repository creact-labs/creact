import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@creact-labs/creact": resolve(__dirname, "../creact/src"),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: resolve(__dirname, "../creact/src/jsx"),
  },
  test: {
    include: ["test/**/*.spec.{ts,tsx}"],
    environment: "node",
  },
});
