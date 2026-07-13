import type { DirectoryNode, FileSystemTree } from "@webcontainer/api";

// Nest a flat { "a/b/c.js": contents } map into a WebContainer FileSystemTree.
function nest(files: Record<string, string>): FileSystemTree {
  const root: FileSystemTree = {};
  for (const [path, contents] of Object.entries(files)) {
    const parts = path.split("/");
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!dir[part]) dir[part] = { directory: {} };
      dir = (dir[part] as DirectoryNode).directory;
    }
    dir[parts[parts.length - 1]!] = { file: { contents } };
  }
  return root;
}

// The shared base mounted once per container: a module-type package.json and
// the prebuilt @creact-labs/creact package in node_modules (from the runtime
// manifest). Each demo runs in its own subdirectory and resolves the package
// by walking up to this node_modules.
export function baseFiles(runtimeManifest: Record<string, string>): FileSystemTree {
  return {
    "package.json": { file: { contents: JSON.stringify({ type: "module" }) } },
    node_modules: {
      directory: {
        "@creact-labs": {
          directory: { creact: { directory: nest(runtimeManifest) } },
        },
      },
    },
  };
}

// The runner that invokes a demo's default export (the CReact CLI does this in
// production; plain `node` does not).
export const RUNNER = `import app from "./app.mjs";\nawait app();\n`;
