// Builds a StackBlitz WebContainer project from an example's real source and
// embeds the full IDE. The app runs exactly as it does locally: the actual
// `creact` CLI over the actual TSX, with `@creact-labs/creact` installed from
// npm and every example package it imports carried in as a workspace. No
// replicas, no pre-bundling — StackBlitz runs `npm install` then the app.

import sdk, { type Project, type VM } from "@stackblitz/sdk";
import { appSources, examplePackageFiles } from "./sources";

// creact is the one dependency pulled from npm; its published version is what
// makes the in-browser IDE possible at all.
const CREACT_DEP = "^0.4.0";

const SCOPE = "@creact-labs/example-";

// Apps that guard on credentials before their (now mocked) service calls need
// the env present just to boot — page-writer exits without ANTHROPIC_API_KEY.
// The values are obvious mocks; the mock service packages ignore them. Keyed by
// app id, prepended to the run command.
const MOCK_ENV: Record<string, string> = {
  "page-writer": "ANTHROPIC_API_KEY=mock ",
};

const TSCONFIG = `${JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      verbatimModuleSyntax: true,
      jsx: "react-jsx",
      jsxImportSource: "@creact-labs/creact",
      skipLibCheck: true,
    },
    include: ["./**/*"],
  },
  null,
  2,
)}\n`;

/** Dir names ("file-memory", "mock-s3") of the example packages an app uses. */
export function exampleDepDirs(deps: Record<string, string> = {}): string[] {
  return Object.keys(deps)
    .filter((name) => name.startsWith(SCOPE))
    .map((name) => name.slice(SCOPE.length));
}

/** The project's root package.json: the app's own, but with creact pinned to
 * the published npm version, workspaces wired for the example packages, a dev
 * script mirroring start so StackBlitz boots the app either way, and any mock
 * env the app needs baked into the run command. */
export function rootPackageJson(
  appPkg: {
    name?: string;
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  },
  env = "",
): string {
  const start = `${env}${appPkg.scripts?.start ?? "creact index.tsx"}`;
  const pkg = {
    name: appPkg.name ?? "creact-example",
    private: true,
    type: "module",
    workspaces: ["packages/*"],
    scripts: { start, dev: start },
    dependencies: {
      ...appPkg.dependencies,
      "@creact-labs/creact": CREACT_DEP,
    },
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

/** Assemble the real example into a StackBlitz WebContainer project: the app at
 * the root, each example package it depends on as a workspace under packages/,
 * creact from npm. package.json and tsconfig are regenerated to stand alone off
 * the monorepo; everything else is the untouched source. */
export function buildProject(app: string, title: string): Project {
  const source = appSources(app).files;
  const appPkg = JSON.parse(source["package.json"]) as {
    name?: string;
    dependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  const files: Record<string, string> = {};
  for (const [rel, contents] of Object.entries(source)) {
    if (rel === "package.json" || rel === "tsconfig.json") continue;
    files[rel] = contents;
  }
  for (const dir of exampleDepDirs(appPkg.dependencies)) {
    for (const [rel, contents] of Object.entries(examplePackageFiles(dir))) {
      files[`packages/${dir}/${rel}`] = contents;
    }
  }
  files["package.json"] = rootPackageJson(appPkg, MOCK_ENV[app] ?? "");
  files["tsconfig.json"] = TSCONFIG;

  return {
    title: `CReact — ${title}`,
    description: `The real ${title} example, running on @creact-labs/creact ${CREACT_DEP}.`,
    template: "node",
    files,
  };
}

/** Embed the full StackBlitz IDE for an app — editor, terminal, live output. */
export function embed(el: HTMLElement, app: string, title: string): Promise<VM> {
  return sdk.embedProject(el, buildProject(app, title), {
    openFile: "index.tsx",
    view: "editor",
    terminalHeight: 45,
    height: "100%",
  });
}
