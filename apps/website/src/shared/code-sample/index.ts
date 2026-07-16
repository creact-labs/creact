/**
 * Code samples are loaded from real, type-checked example apps in
 * libs/examples — never written inline in components. Files use VS Code
 * region markers (`// #region name` … `// #endregion name`), and pages
 * request a slice by app path + region (VitePress-style snippet imports).
 */

// Raw source of every example file, keyed by path relative to libs/examples/.
// Apps are addressed as "<app>/<path>", example packages as "packages/<path>".
const sources = import.meta.glob(
  "../../../../../libs/examples/{apps,packages}/**/*.{ts,tsx}",
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

function sourceOf(appPath: string): string {
  const suffix = appPath.startsWith("packages/")
    ? `/libs/examples/${appPath}`
    : `/apps/${appPath}`;
  const entry = Object.entries(sources).find(([path]) =>
    path.endsWith(suffix),
  );
  if (!entry) {
    throw new Error(
      `Unknown example source "${appPath}" — expected a file under libs/examples/`,
    );
  }
  return entry[1];
}

/** Strip the common leading indentation left over from slicing a region */
function dedent(lines: string[]): string {
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^\s*/)![0].length);
  const cut = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(cut)).join("\n");
}

/**
 * The source of one region of an example app.
 *
 * @param appPath - Path relative to libs/examples/apps, e.g.
 *   "page-writer/src/app.tsx", or "packages/…" for example packages
 * @param region - Region name between `// #region <name>` and `// #endregion`
 */
export function codeSample(appPath: string, region: string): string {
  const source = sourceOf(appPath);
  const lines = source.split("\n");
  const start = lines.findIndex((line) =>
    line.trim().startsWith(`// #region ${region}`),
  );
  const end = lines.findIndex(
    (line, index) =>
      index > start && line.trim().startsWith("// #endregion"),
  );
  if (start === -1 || end === -1) {
    throw new Error(`Region "${region}" not found in "${appPath}"`);
  }
  return dedent(lines.slice(start + 1, end));
}

/** The full source of an example app file */
export function fullSource(appPath: string): string {
  return sourceOf(appPath);
}
