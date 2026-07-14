import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@creact-labs/creact/jsx-dev-runtime": resolve(
        __dirname,
        "../../packages/creact/src/jsx/jsx-dev-runtime.ts",
      ),
      "@creact-labs/creact/jsx-runtime": resolve(
        __dirname,
        "../../packages/creact/src/jsx/jsx-runtime.ts",
      ),
      "@creact-labs/creact": resolve(
        __dirname,
        "../../packages/creact/src/index.ts",
      ),
      "@creact-labs/example-memory": resolve(
        __dirname,
        "packages/memory/src/index.ts",
      ),
      "@creact-labs/example-file-memory": resolve(
        __dirname,
        "packages/file-memory/src/index.ts",
      ),
      "@creact-labs/testing": resolve(
        __dirname,
        "../../packages/testing/src/index.ts",
      ),
    },
  },
  test: {
    include: ["apps/**/__tests__/**/*.test.{ts,tsx}", "packages/**/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // json (Istanbul coverage-final.json) feeds fallow's CRAP scoring
      reporter: ["text", "json"],
      include: ["apps/**/src/**/*.{ts,tsx}", "apps/**/index.tsx", "packages/**/src/**/*.ts"],
      exclude: [
        "**/__tests__/**",
        "**/__mocks__/**",
      ],
    },
  },
});
