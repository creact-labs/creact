import { describe, expect, it } from "vitest";
import { MEMORY_KINDS, projectFiles } from "../templates.js";

describe("projectFiles", () => {
  const files = projectFiles("my-app");

  it("returns the expected file set, defaulting to file memory", () => {
    expect(Object.keys(files).sort()).toEqual(
      [
        ".gitignore",
        "README.md",
        "index.tsx",
        "memory.ts",
        "package.json",
        "tsconfig.json",
      ].sort(),
    );
  });

  it("does not scaffold any Vite files", () => {
    expect(files["vite.config.ts"]).toBeUndefined();
    expect(files["package.json"]).not.toContain("vite");
  });

  it("produces a package.json with the creact run scripts and dep", () => {
    const pkg = JSON.parse(files["package.json"]!);
    expect(pkg.name).toBe("my-app");
    expect(pkg.type).toBe("module");
    expect(pkg.scripts.dev).toBe("creact --watch index.tsx");
    expect(pkg.scripts.start).toBe("creact index.tsx");
    expect(pkg.scripts.build).toBeUndefined();
    expect(pkg.dependencies["@creact-labs/creact"]).toBe("^0.4.0");
  });

  it("produces a tsconfig with the CReact jsxImportSource", () => {
    const ts = JSON.parse(files["tsconfig.json"]!);
    expect(ts.compilerOptions.jsx).toBe("react-jsx");
    expect(ts.compilerOptions.jsxImportSource).toBe("@creact-labs/creact");
  });

  it("produces a real index.tsx entry importing the chosen memory", () => {
    const index = files["index.tsx"]!;
    expect(index).toContain("useAsyncOutput");
    expect(index).toContain("render(");
    expect(index).toContain('from "./memory.js"');
    expect(index).toContain("export default async function");
  });
});

describe("projectFiles memory backends", () => {
  it("covers every declared memory kind", () => {
    expect(MEMORY_KINDS).toEqual(["file", "sqlite", "memory", "custom"]);
  });

  it("file backend writes a JSON ledger with no extra deps", () => {
    const files = projectFiles("app", "file");
    expect(files["memory.ts"]).toContain("FileMemory");
    expect(files["memory.ts"]).toContain("./.state");
    const pkg = JSON.parse(files["package.json"]!);
    expect(pkg.dependencies["better-sqlite3"]).toBeUndefined();
  });

  it("sqlite backend pulls in better-sqlite3 and ignores the db file", () => {
    const files = projectFiles("app", "sqlite");
    expect(files["memory.ts"]).toContain("better-sqlite3");
    expect(files["memory.ts"]).toContain("SqliteMemory");
    const pkg = JSON.parse(files["package.json"]!);
    expect(pkg.dependencies["better-sqlite3"]).toBe("^11.0.0");
    expect(pkg.devDependencies["@types/better-sqlite3"]).toBe("^7.6.0");
    expect(files[".gitignore"]).toContain("creact.db");
  });

  it("memory backend keeps state in a Map with no persistence", () => {
    const files = projectFiles("app", "memory");
    expect(files["memory.ts"]).toContain("InMemoryMemory");
    expect(files["memory.ts"]).toContain("new Map");
    const pkg = JSON.parse(files["package.json"]!);
    expect(pkg.dependencies["better-sqlite3"]).toBeUndefined();
  });

  it("custom backend scaffolds an unimplemented Memory skeleton", () => {
    const files = projectFiles("app", "custom");
    expect(files["memory.ts"]).toContain("class CustomMemory implements Memory");
    expect(files["memory.ts"]).toContain("not implemented");
    const pkg = JSON.parse(files["package.json"]!);
    expect(pkg.dependencies["better-sqlite3"]).toBeUndefined();
  });
});
