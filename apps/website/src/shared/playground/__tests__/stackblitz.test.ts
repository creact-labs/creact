import { afterEach, describe, expect, it, vi } from "vitest";

// The SDK talks to a real StackBlitz iframe; here we only assert we call it
// with the project we built.
const embedProject = vi.fn(
  (_el: unknown, _project: unknown, _opts?: unknown) => Promise.resolve({} as never),
);
vi.mock("@stackblitz/sdk", () => ({
  default: {
    embedProject: (el: unknown, project: unknown, opts?: unknown) =>
      embedProject(el, project, opts),
  },
}));

import { buildProject, embed, exampleDepDirs, rootPackageJson } from "../stackblitz";

afterEach(() => vi.clearAllMocks());

describe("exampleDepDirs", () => {
  it("extracts the example package dir names from an app's deps", () => {
    expect(
      exampleDepDirs({
        "@creact-labs/creact": "^0.4.0",
        "@creact-labs/example-file-memory": "*",
        "@creact-labs/example-mock-s3": "*",
      }),
    ).toEqual(["file-memory", "mock-s3"]);
  });

  it("returns nothing when the app has no example deps or none at all", () => {
    expect(exampleDepDirs({ "@creact-labs/creact": "^0.4.0" })).toEqual([]);
    expect(exampleDepDirs()).toEqual([]);
  });
});

describe("rootPackageJson", () => {
  it("pins creact to the npm version, wires workspaces, mirrors start to dev", () => {
    const pkg = JSON.parse(
      rootPackageJson({
        name: "@creact-labs/example-x",
        scripts: { start: "creact index.tsx" },
        dependencies: {
          "@creact-labs/creact": "*",
          "@creact-labs/example-file-memory": "*",
        },
      }),
    );
    expect(pkg.dependencies["@creact-labs/creact"]).toBe("^0.4.0");
    expect(pkg.dependencies["@creact-labs/example-file-memory"]).toBe("*");
    expect(pkg.workspaces).toEqual(["packages/*"]);
    expect(pkg.scripts).toEqual({
      start: "creact index.tsx",
      dev: "creact index.tsx",
    });
  });

  it("defaults the name and start command when the app omits them", () => {
    const pkg = JSON.parse(rootPackageJson({}));
    expect(pkg.name).toBe("creact-example");
    expect(pkg.scripts.start).toBe("creact index.tsx");
    expect(pkg.dependencies["@creact-labs/creact"]).toBe("^0.4.0");
  });

  it("bakes the env prefix into the run command", () => {
    const pkg = JSON.parse(
      rootPackageJson({ scripts: { start: "creact index.tsx" } }, "ANTHROPIC_API_KEY=mock "),
    );
    expect(pkg.scripts.start).toBe("ANTHROPIC_API_KEY=mock creact index.tsx");
    expect(pkg.scripts.dev).toBe("ANTHROPIC_API_KEY=mock creact index.tsx");
  });
});

describe("buildProject", () => {
  it("carries the real app source plus its example packages, regenerating config", () => {
    const project = buildProject("site-publisher", "Site Publisher");
    expect(project.template).toBe("node");
    expect(project.title).toContain("Site Publisher");
    // real app source, verbatim
    expect(project.files["index.tsx"]).toBeDefined();
    // the example packages it depends on, carried in as workspaces
    expect(project.files["packages/mock-s3/src/index.ts"]).toContain("S3Client");
    expect(project.files["packages/file-memory/src/index.ts"]).toContain("FileMemory");
    // config regenerated to stand alone off the monorepo
    expect(project.files["tsconfig.json"]).toContain("@creact-labs/creact");
    const pkg = JSON.parse(project.files["package.json"]);
    expect(pkg.dependencies["@creact-labs/creact"]).toBe("^0.4.0");
    // the app's own package.json/tsconfig are replaced, not duplicated
    expect(project.files["package.json"]).not.toContain('"private": true,\n  "description"');
  });

  it("bakes an app's required mock credentials into the run command", () => {
    const project = buildProject("page-writer", "Page Writer");
    const pkg = JSON.parse(project.files["package.json"]);
    // page-writer exits without ANTHROPIC_API_KEY; the mock lets it boot
    expect(pkg.scripts.start).toContain("ANTHROPIC_API_KEY=mock");
    expect(project.files["packages/mock-anthropic/src/index.ts"]).toBeDefined();
  });
});

describe("embed", () => {
  it("embeds the built project into the host element", async () => {
    const el = document.createElement("div");
    await embed(el, "durable-counter", "Durable Counter");
    expect(embedProject).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ template: "node", title: "CReact — Durable Counter" }),
      expect.objectContaining({ openFile: "index.tsx" }),
    );
  });
});
