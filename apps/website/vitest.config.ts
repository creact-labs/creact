import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
    conditions: ["development", "browser"],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    setupFiles: ["src/testing/mocks.ts"],
    server: {
      deps: {
        // @solidjs/router ships untranspiled .jsx — inline so vite transforms it
        inline: [/solid-js/, /@solidjs/],
      },
    },
  },
});
