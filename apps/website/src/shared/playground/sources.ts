// Real example-app sources, pulled straight from libs/examples at build time.
// The playground bundles and runs these — no replicas. Code files are bundled;
// data files (a site/ folder, tenants.json, …) are mounted as-is so the app's
// runtime fs reads work.

const rawAppFiles = import.meta.glob(
  "../../../../../libs/examples/apps/**/*",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const rawPackageFiles = import.meta.glob(
  "../../../../../libs/examples/packages/*/src/index.ts",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

function stripApp(fullPath: string): { app: string; rel: string } {
  const rest = fullPath.slice(fullPath.indexOf("/apps/") + "/apps/".length);
  const slash = rest.indexOf("/");
  return { app: rest.slice(0, slash), rel: rest.slice(slash + 1) };
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

/** Bare `@creact-labs/example-*` specifier → its single-file src contents,
 * bundled into the app so only @creact-labs/creact stays external. */
export function packageSources(): Record<string, string> {
  const packages: Record<string, string> = {};
  for (const [fullPath, contents] of Object.entries(rawPackageFiles)) {
    const dir = fullPath.slice(
      fullPath.indexOf("/packages/") + "/packages/".length,
      fullPath.indexOf("/src/index.ts"),
    );
    packages[`@creact-labs/example-${dir}`] = contents;
  }
  return packages;
}
