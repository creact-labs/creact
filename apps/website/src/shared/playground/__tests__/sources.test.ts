import { describe, expect, it } from "vitest";
import { appSources, packageSources } from "../sources";

describe("appSources", () => {
  it("returns a real app's files, excluding tests and mocks", () => {
    const { files } = appSources("durable-counter");
    expect(files["index.tsx"]).toBeDefined();
    expect(files["src/app.tsx"]).toBeDefined();
    for (const path of Object.keys(files)) {
      expect(path).not.toContain("__tests__/");
      expect(path).not.toContain("__mocks__/");
    }
  });

  it("scopes to the requested app only", () => {
    const { files } = appSources("site-publisher");
    expect(files["src/aws/provider/index.tsx"]).toBeDefined();
    // a file unique to another app must not leak in
    expect(files["src/components/http-check/index.tsx"]).toBeUndefined();
  });
});

describe("packageSources", () => {
  it("keys each example package by its bare specifier", () => {
    const packages = packageSources();
    expect(packages["@creact-labs/example-file-memory"]).toContain("FileMemory");
    expect(packages["@creact-labs/example-mock-s3"]).toContain("S3Client");
    expect(packages["@creact-labs/example-mock-anthropic"]).toBeDefined();
  });
});
