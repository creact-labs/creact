import { describe, expect, it } from "vitest";
import { isCode, dataFiles } from "../runner";

describe("isCode", () => {
  it.each([
    ["index.tsx", true],
    ["src/app.ts", true],
    ["site/index.html", false],
    ["tenants.json", false],
  ])("%s → %s", (path, expected) => {
    expect(isCode(path)).toBe(expected);
  });
});

describe("dataFiles", () => {
  it("keeps runtime data files and drops source + project manifests", () => {
    const files = {
      "index.tsx": "code",
      "src/app.tsx": "code",
      "package.json": "{}",
      "tsconfig.json": "{}",
      "site/index.html": "<h1>hi</h1>",
      "tenants.json": "[]",
    };
    expect(dataFiles(files)).toEqual({
      "site/index.html": "<h1>hi</h1>",
      "tenants.json": "[]",
    });
  });
});
