import { describe, expect, it } from "vitest";
import { MEMORY_KINDS, projectFiles } from "../templates.js";

describe("projectFiles", () => {
  const files = projectFiles("my-app");

  it("returns the expected file set, defaulting to file memory", () => {
    expect(Object.keys(files).sort()).toEqual(
      [
        ".gitignore",
        "README.md",
        "index.test.ts",
        "index.tsx",
        "memory.ts",
        "package.json",
        "tsconfig.json",
        "vitest.config.ts",
      ].sort(),
    );
  });

  it("is not a Vite frontend app (vitest as the test runner is fine)", () => {
    expect(files["vite.config.ts"]).toBeUndefined();
    const pkg = JSON.parse(files["package.json"]!);
    expect(pkg.dependencies.vite).toBeUndefined();
    expect(pkg.devDependencies.vite).toBeUndefined();
  });

  it("produces a package.json with the creact run scripts and dep", () => {
    const pkg = JSON.parse(files["package.json"]!);
    expect(pkg.name).toBe("my-app");
    expect(pkg.type).toBe("module");
    expect(pkg.scripts.dev).toBe("creact --watch index.tsx");
    expect(pkg.scripts.start).toBe("creact index.tsx");
    expect(pkg.scripts.test).toBe("vitest --run");
    expect(pkg.scripts.build).toBeUndefined();
    expect(pkg.dependencies["@creact-labs/creact"]).toBe("^0.4.0");
    expect(pkg.devDependencies["@creact-labs/testing"]).toBe("^0.1.0");
    expect(pkg.devDependencies.vitest).toBeDefined();
  });

  it("scaffolds a vitest test that drives the counter with @creact-labs/testing", () => {
    expect(files["index.tsx"]).toContain("export function Counter");
    const test = files["index.test.ts"]!;
    expect(test).toContain("@creact-labs/testing");
    expect(test).toContain("renderTest");
    expect(test).toContain("Counter");
    expect(files["vitest.config.ts"]).toContain(
      'jsxImportSource: "@creact-labs/creact"',
    );
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

  it("names the render stack after the project, not a hardcoded value", () => {
    expect(projectFiles("cool-app")["index.tsx"]).toContain('"cool-app"');
    expect(projectFiles("my-app")["index.tsx"]).not.toContain('"cool-app"');
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

  it("custom backend scaffolds a runnable Memory skeleton to fill in", () => {
    const files = projectFiles("app", "custom");
    expect(files["memory.ts"]).toContain("class CustomMemory implements Memory");
    // Runs out of the box (in-memory Map) with TODOs — it must never throw.
    expect(files["memory.ts"]).toContain("new Map");
    expect(files["memory.ts"]).toContain("TODO");
    expect(files["memory.ts"]).not.toContain("not implemented");
    const pkg = JSON.parse(files["package.json"]!);
    expect(pkg.dependencies["better-sqlite3"]).toBeUndefined();
  });

  it("every memory backend scaffolds a runnable module (never throws)", () => {
    for (const kind of MEMORY_KINDS) {
      expect(projectFiles("app", kind)["memory.ts"]).not.toContain(
        "not implemented",
      );
    }
  });
});
