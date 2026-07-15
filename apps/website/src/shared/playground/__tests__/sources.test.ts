import { describe, expect, it } from "vitest";
import { appSources, examplePackageFiles } from "../sources";

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

describe("examplePackageFiles", () => {
  it("returns a real example package's files, keyed to its root", () => {
    const files = examplePackageFiles("file-memory");
    expect(files["package.json"]).toContain("@creact-labs/example-file-memory");
    expect(files["src/index.ts"]).toContain("FileMemory");
  });

  it("scopes to the requested package and drops tests and mocks", () => {
    const files = examplePackageFiles("mock-s3");
    expect(files["src/index.ts"]).toContain("S3Client");
    for (const path of Object.keys(files)) {
      expect(path).not.toContain("__tests__/");
      expect(path).not.toContain("__mocks__/");
    }
  });
});
