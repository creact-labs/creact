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
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      // json produces coverage-final.json — merged with the other
      // packages' coverage for fallow's CRAP scoring
      reporter: ["text", "json"],
      include: ["src/**"],
      exclude: ["src/**/__tests__/**"],
    },
  },
});
