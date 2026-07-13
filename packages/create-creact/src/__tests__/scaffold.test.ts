import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { errorMessage, nextSteps, scaffold } from "../index.js";

describe("scaffold", () => {
  let base: string;

  beforeEach(() => {
    base = join(tmpdir(), `create-creact-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(base, { recursive: true });
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it("writes all project files into a fresh directory", () => {
    const target = join(base, "fresh-app");
    scaffold(target);

    for (const file of [
      "index.tsx",
      "package.json",
      "vite.config.ts",
      "tsconfig.json",
      "README.md",
      ".gitignore",
    ]) {
      expect(existsSync(join(target, file))).toBe(true);
    }

    const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf-8"));
    expect(pkg.name).toBe("fresh-app");
  });

  it("scaffolds into an existing empty directory", () => {
    const target = join(base, "empty-app");
    mkdirSync(target, { recursive: true });
    scaffold(target);
    expect(existsSync(join(target, "index.tsx"))).toBe(true);
  });

  it("refuses to scaffold into a non-empty directory", () => {
    const target = join(base, "occupied");
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "keep.txt"), "hi");
    expect(() => scaffold(target)).toThrow(/not empty/);
  });
});

describe("errorMessage", () => {
  it("reads the message of an Error", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("stringifies a non-Error value", () => {
    expect(errorMessage("plain")).toBe("plain");
  });
});

describe("nextSteps", () => {
  it("names the target directory in the guidance", () => {
    expect(nextSteps("my-app")).toContain("cd my-app");
  });
});
