import { describe, expect, it } from "vitest";
import type { DirectoryNode, FileNode } from "@webcontainer/api";
import { baseFiles, RUNNER } from "../project";

describe("baseFiles", () => {
  it("mounts a module package.json and the manifest under node_modules", () => {
    const tree = baseFiles({
      "package.json": '{"name":"@creact-labs/creact"}',
      "dist/src/index.js": "export const x = 1;",
    });

    const pkg = tree["package.json"] as FileNode;
    expect(JSON.parse(pkg.file.contents as string)).toEqual({ type: "module" });

    const modules = tree.node_modules as DirectoryNode;
    const scope = modules.directory["@creact-labs"] as DirectoryNode;
    const creact = scope.directory.creact as DirectoryNode;
    const dist = creact.directory.dist as DirectoryNode;
    const src = dist.directory.src as DirectoryNode;
    expect((src.directory["index.js"] as FileNode).file.contents).toContain("export const x");
    expect(creact.directory["package.json"]).toBeDefined();
  });

  it("RUNNER invokes the compiled default export", () => {
    expect(RUNNER).toContain("./app.mjs");
    expect(RUNNER).toContain("await app()");
  });
});
