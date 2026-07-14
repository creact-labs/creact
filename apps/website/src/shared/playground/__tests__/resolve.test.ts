import { describe, expect, it } from "vitest";
import { resolveImport } from "../resolve";

const files = {
  "index.tsx": "",
  "src/app.tsx": "",
  "src/aws/provider/index.tsx": "",
  "tenants.json": "",
};
const packages = { "@creact-labs/example-file-memory": "" };

describe("resolveImport", () => {
  it("marks the entry point as an app file", () => {
    expect(resolveImport(files, packages, { kind: "entry-point", path: "index.tsx", importer: "" })).toEqual({
      kind: "app",
      path: "index.tsx",
    });
  });

  it("resolves a relative import within the app, trying extensions and index files", () => {
    expect(
      resolveImport(files, packages, { kind: "import-statement", path: "./src/app", importer: "index.tsx" }),
    ).toEqual({ kind: "app", path: "src/app.tsx" });
    expect(
      resolveImport(files, packages, { kind: "import-statement", path: "../provider", importer: "src/aws/site-bucket/index.tsx" }),
    ).toEqual({ kind: "app", path: "src/aws/provider/index.tsx" });
  });

  it("errors on an unresolvable relative import", () => {
    const result = resolveImport(files, packages, { kind: "import-statement", path: "./missing", importer: "index.tsx" });
    expect(result.kind).toBe("error");
  });

  it("resolves an example package to the pkg namespace", () => {
    expect(
      resolveImport(files, packages, { kind: "import-statement", path: "@creact-labs/example-file-memory", importer: "index.tsx" }),
    ).toEqual({ kind: "pkg", path: "@creact-labs/example-file-memory" });
  });

  it("marks creact and node built-ins as external", () => {
    for (const path of ["@creact-labs/creact", "@creact-labs/creact/jsx-runtime", "node:fs", "path"]) {
      expect(resolveImport(files, packages, { kind: "import-statement", path, importer: "index.tsx" })).toEqual({
        kind: "external",
      });
    }
  });
});
