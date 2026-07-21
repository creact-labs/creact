import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  errorMessage,
  nextSteps,
  parseArgs,
  scaffold,
} from "../index";

describe("parseArgs", () => {
  it("defaults the directory and leaves memory unset", () => {
    expect(parseArgs([])).toEqual({ targetDir: "creact-app" });
  });

  it("reads the target directory from the first positional arg", () => {
    expect(parseArgs(["my-app"]).targetDir).toBe("my-app");
  });

  it("reads a valid --memory flag", () => {
    expect(parseArgs(["app", "--memory=sqlite"]).memory).toBe("sqlite");
  });

  it("ignores an unknown --memory value", () => {
    expect(parseArgs(["app", "--memory=redis"]).memory).toBeUndefined();
  });
});

describe("scaffold", () => {
  let base: string;

  beforeEach(() => {
    base = join(tmpdir(), `create-creact-app-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(base, { recursive: true });
  });

  afterEach(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it("writes all project files into a fresh directory", () => {
    const target = join(base, "fresh-app");
    scaffold(target, "file");

    for (const file of [
      "index.tsx",
      "memory.ts",
      "package.json",
      "tsconfig.json",
      "README.md",
      ".gitignore",
    ]) {
      expect(existsSync(join(target, file))).toBe(true);
    }

    const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf-8"));
    expect(pkg.name).toBe("fresh-app");
  });

  it("scaffolds the chosen memory backend", () => {
    const target = join(base, "sqlite-app");
    scaffold(target, "sqlite");
    expect(readFileSync(join(target, "memory.ts"), "utf-8")).toContain(
      "better-sqlite3",
    );
  });

  it("refuses to scaffold into a non-empty directory", () => {
    const target = join(base, "occupied");
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "keep.txt"), "hi");
    expect(() => scaffold(target, "file")).toThrow(/not empty/);
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
