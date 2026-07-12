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
    coverage: {
      provider: "v8",
      // text for humans, json (Istanbul coverage-final.json) for fallow CRAP scoring
      reporter: ["text", "json"],
      include: [
        "src/**/*.ts",
        "flow/src/**/*.ts",
        "runtime/src/**/*.ts",
        "store/src/**/*.ts",
      ],
      exclude: [
        // Bin entry: executes main() at import, registers process.exit/SIGINT
        // handlers and an infinite fs.watch loop — importing it in-process
        // would terminate the test runner. Covered indirectly via cli-logger
        // and cli-typecheck, which hold all its extractable logic.
        "src/cli.ts",
        // Pure `export type` modules: esbuild erases them to empty files, so
        // v8 records zero executable statements and reports every source line
        // as an uncoverable miss. public-api.spec.ts asserts they stay
        // runtime-empty.
        "src/types.ts",
        "src/jsx/types.ts",
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
});
