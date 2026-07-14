import * as esbuild from "esbuild-wasm";
import wasmURL from "esbuild-wasm/esbuild.wasm?url";
import { packageSources } from "./sources";
import { loaderFor, resolveImport } from "./resolve";

let ready: Promise<void> | undefined;

function init(): Promise<void> {
  if (!ready) ready = esbuild.initialize({ wasmURL });
  return ready;
}

// Bundle one example app from its real source. Relative imports resolve within
// the app; @creact-labs/example-* packages are bundled from source; only
// @creact-labs/creact and node built-ins stay external (mounted / native).
export async function bundleApp(
  files: Record<string, string>,
  entry = "index.tsx",
): Promise<string> {
  await init();
  const packages = packageSources();

  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    jsxImportSource: "@creact-labs/creact",
    external: ["@creact-labs/creact", "@creact-labs/creact/*"],
    plugins: [
      {
        name: "example-vfs",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            const resolution = resolveImport(files, packages, args);
            if (resolution.kind === "external") return { external: true };
            if (resolution.kind === "error") return { errors: [{ text: resolution.message }] };
            return { path: resolution.path, namespace: resolution.kind };
          });
          build.onLoad({ filter: /.*/, namespace: "app" }, (args) => ({
            contents: files[args.path] ?? "",
            loader: loaderFor(args.path),
          }));
          build.onLoad({ filter: /.*/, namespace: "pkg" }, (args) => ({
            contents: packages[args.path] ?? "",
            loader: "ts",
          }));
        },
      },
    ],
  });

  return result.outputFiles[0]!.text;
}
