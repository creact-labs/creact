// Pure module-resolution logic for the in-browser bundler. Kept separate from
// compile.ts so it can be unit-tested without loading esbuild-wasm.

export type Loader = "ts" | "tsx" | "json";

export function loaderFor(path: string): Loader {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".json")) return "json";
  return "ts";
}

/** Join a base dir with a relative specifier, resolving . and .. segments. */
export function joinPath(base: string, spec: string): string {
  const parts = base ? base.split("/") : [];
  for (const segment of spec.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

/** Resolve a relative import to an actual key in the app file map. */
export function resolveRelative(
  files: Record<string, string>,
  importer: string,
  spec: string,
): string | undefined {
  const dir = importer.includes("/") ? importer.slice(0, importer.lastIndexOf("/")) : "";
  const joined = joinPath(dir, spec);
  const candidates = [
    joined,
    `${joined}.ts`,
    `${joined}.tsx`,
    `${joined}.json`,
    `${joined}/index.ts`,
    `${joined}/index.tsx`,
  ];
  return candidates.find((candidate) => candidate in files);
}

export type Resolution =
  | { kind: "app" | "pkg"; path: string }
  | { kind: "external" }
  | { kind: "error"; message: string };

/** Decide how one import resolves: bundled app file, bundled example package,
 * external (creact / node built-in), or an error. */
export function resolveImport(
  files: Record<string, string>,
  packages: Record<string, string>,
  args: { kind: string; path: string; importer: string },
): Resolution {
  if (args.kind === "entry-point") return { kind: "app", path: args.path };
  if (args.path.startsWith(".")) {
    const resolved = resolveRelative(files, args.importer, args.path);
    if (resolved) return { kind: "app", path: resolved };
    return { kind: "error", message: `Cannot resolve "${args.path}" from "${args.importer}"` };
  }
  if (args.path in packages) return { kind: "pkg", path: args.path };
  return { kind: "external" };
}
