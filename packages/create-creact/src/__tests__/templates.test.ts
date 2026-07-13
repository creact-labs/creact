import { describe, expect, it } from "vitest";
import { projectFiles } from "../templates.js";

describe("projectFiles", () => {
  const files = projectFiles("my-app");

  it("returns the expected file set", () => {
    expect(Object.keys(files).sort()).toEqual(
      [
        ".gitignore",
        "README.md",
        "index.tsx",
        "package.json",
        "tsconfig.json",
        "vite.config.ts",
      ].sort(),
    );
  });

  it("produces a package.json named after the target with the dev script and creact dep", () => {
    const pkg = JSON.parse(files["package.json"]!);
    expect(pkg.name).toBe("my-app");
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe("module");
    expect(pkg.scripts.dev).toBe("creact --watch index.tsx");
    expect(pkg.scripts.start).toBe("creact index.tsx");
    expect(pkg.dependencies["@creact-labs/creact"]).toBe("^0.4.0");
    expect(pkg.devDependencies["@creact-labs/vite-plugin"]).toBe("^0.4.0");
  });

  it("produces a tsconfig with the CReact jsxImportSource", () => {
    const ts = JSON.parse(files["tsconfig.json"]!);
    expect(ts.compilerOptions.jsx).toBe("react-jsx");
    expect(ts.compilerOptions.jsxImportSource).toBe("@creact-labs/creact");
  });

  it("wires the vite plugin in vite.config.ts", () => {
    expect(files["vite.config.ts"]).toContain("@creact-labs/vite-plugin");
    expect(files["vite.config.ts"]).toContain("creact()");
  });

  it("produces a real index.tsx entry with a durable counter", () => {
    const index = files["index.tsx"]!;
    expect(index).toContain("useAsyncOutput");
    expect(index).toContain("render(");
    expect(index).toContain("setInterval");
    expect(index).toContain("export default async function");
  });
});
