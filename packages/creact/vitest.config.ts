import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@creact-labs/creact": resolve(__dirname, "src"),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: resolve(__dirname, "src/jsx"),
  },
  test: {
    include: [
      "test/**/*.spec.{ts,tsx}",
      "store/test/**/*.spec.{ts,tsx}",
      "flow/test/**/*.spec.{ts,tsx}",
      "runtime/test/**/*.spec.{ts,tsx}",
    ],
    environment: "node",
  },
});
