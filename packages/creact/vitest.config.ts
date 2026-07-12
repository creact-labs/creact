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
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      // text for humans, json (Istanbul coverage-final.json) for fallow CRAP scoring
      reporter: ["text", "json"],
      include: ["src/**/*.ts"],
      exclude: [
        // Test suites, mocks/factories, and shared test utilities are not
        // product code — coverage measures what they exercise, not them
        "src/**/__tests__/**",
        "src/**/__mocks__/**",
        "src/testing/**",
        // Bin entry: a thin process shell (shebang, SIGINT/SIGTERM handlers,
        // process.exit, the infinite fs.watch loop) — importing it in-process
        // would run main() and kill the test runner. ALL its logic lives in
        // cli-main.ts / cli-logger.ts / cli-typecheck.ts, which are covered
        // at 100%.
        "src/cli.ts",
        // Pure `export type` module: esbuild erases it to an empty file, so
        // v8 records zero executable statements and would report every source
        // line as an uncoverable miss. public-api.spec.ts asserts it stays
        // runtime-empty.
        "src/types.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
