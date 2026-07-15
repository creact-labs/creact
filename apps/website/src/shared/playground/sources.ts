// Real example sources, pulled straight from libs/examples at build time. The
// playground ships these verbatim into a StackBlitz project and runs the actual
// app with the actual creact CLI — no replicas, no pre-bundling. Both the app
// files and the example packages it depends on are carried as-is.

const rawAppFiles = import.meta.glob(
  "../../../../../libs/examples/apps/**/*",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const rawPackageFiles = import.meta.glob(
  "../../../../../libs/examples/packages/*/**/*",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

function stripApp(fullPath: string): { app: string; rel: string } {
  const rest = fullPath.slice(fullPath.indexOf("/apps/") + "/apps/".length);
  const slash = rest.indexOf("/");
  return { app: rest.slice(0, slash), rel: rest.slice(slash + 1) };
}

function stripPackage(fullPath: string): { pkg: string; rel: string } {
  const rest = fullPath.slice(
    fullPath.indexOf("/packages/") + "/packages/".length,
  );
  const slash = rest.indexOf("/");
  return { pkg: rest.slice(0, slash), rel: rest.slice(slash + 1) };
}

function isTestOrMock(rel: string): boolean {
  return rel.includes("__tests__/") || rel.includes("__mocks__/");
}

export interface AppSources {
  /** app-root-relative path → contents (code + data, excluding tests/mocks) */
  files: Record<string, string>;
}

/** The real files of one example app, keyed relative to the app root. */
export function appSources(app: string): AppSources {
  const files: Record<string, string> = {};
  for (const [fullPath, contents] of Object.entries(rawAppFiles)) {
    const { app: name, rel } = stripApp(fullPath);
    if (name !== app || isTestOrMock(rel)) continue;
    files[rel] = contents;
  }
  return { files };
}

/** All files of one example package (its dir name under libs/examples/packages,
 * e.g. "file-memory"), keyed relative to the package root, tests/mocks removed.
 * These are carried into the StackBlitz project as workspace packages so the
 * app resolves `@creact-labs/example-*` to the real source. */
export function examplePackageFiles(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const [fullPath, contents] of Object.entries(rawPackageFiles)) {
    const { pkg, rel } = stripPackage(fullPath);
    if (pkg !== dir || isTestOrMock(rel)) continue;
    files[rel] = contents;
  }
  return files;
}
