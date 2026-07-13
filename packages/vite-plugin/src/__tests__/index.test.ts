import { describe, expect, it } from "vitest";
import { creact } from "../index";

function resolveConfig(plugin: ReturnType<typeof creact>) {
  const hook = plugin.config;
  const fn = typeof hook === "function" ? hook : hook?.handler;
  if (!fn) throw new Error("plugin has no config hook");
  return fn.call({} as never, {}, { command: "build", mode: "production" });
}

describe("creact vite plugin", () => {
  it("names itself so it is identifiable in the plugin pipeline", () => {
    expect(creact().name).toBe("@creact-labs/vite-plugin");
  });

  it("compiles JSX against the CReact runtime by default", () => {
    const config = resolveConfig(creact());
    expect(config).toMatchObject({
      esbuild: { jsx: "automatic", jsxImportSource: "@creact-labs/creact" },
      ssr: { noExternal: ["@creact-labs/creact"] },
    });
  });

  it("honors a custom jsx import source everywhere it is used", () => {
    const config = resolveConfig(creact({ jsxImportSource: "@my/runtime" }));
    expect(config).toMatchObject({
      esbuild: { jsxImportSource: "@my/runtime" },
      ssr: { noExternal: ["@my/runtime"] },
    });
  });
});
