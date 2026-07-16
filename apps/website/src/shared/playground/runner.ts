import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { bootWebContainer, pipeOutput } from "./webcontainer";
import { bundleApp } from "./compile";
import { baseFiles, RUNNER } from "./project";

let basePromise: Promise<WebContainer> | undefined;
const processes = new Map<string, WebContainerProcess>();

// Generous demo environment so apps that require env vars (site-publisher's AWS
// settings) start; the mock clients ignore the credentials.
const DEMO_ENV: Record<string, string> = {
  AWS_REGION: "us-east-1",
  SITE_BUCKET: "creact-demo-site",
  AWS_ACCESS_KEY_ID: "mock",
  AWS_SECRET_ACCESS_KEY: "mock",
  ANTHROPIC_API_KEY: "mock",
  PORT: "3000",
};

export function isCode(path: string): boolean {
  return path.endsWith(".ts") || path.endsWith(".tsx");
}

/** Files the app reads at runtime — everything that isn't bundled source or a
 * project manifest, mounted as-is at its relative path. */
export function dataFiles(files: Record<string, string>): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [path, contents] of Object.entries(files)) {
    if (isCode(path) || path === "package.json" || path === "tsconfig.json") continue;
    data[path] = contents;
  }
  return data;
}

function fetchRuntime(): Promise<Record<string, string>> {
  return fetch(`${import.meta.env.BASE_URL}creact-runtime.json`).then((res) => res.json());
}

// Boot the container and mount the shared base (@creact-labs/creact) once.
function ensureBase(): Promise<WebContainer> {
  if (!basePromise) {
    basePromise = (async () => {
      const [container, runtime] = await Promise.all([bootWebContainer(), fetchRuntime()]);
      await container.mount(baseFiles(runtime));
      return container;
    })();
  }
  return basePromise;
}

// Bundle the real app from its (possibly edited) source and run it in its own
// directory as a fresh `node` process, streaming output to `write`.
export async function runApp(
  app: string,
  files: Record<string, string>,
  write: (chunk: string) => void,
): Promise<void> {
  const [container, bundled] = await Promise.all([ensureBase(), bundleApp(files)]);

  processes.get(app)?.kill();

  const dir = `run-${app}`;
  const tree: Record<string, string> = {
    "app.mjs": bundled,
    "index.mjs": RUNNER,
    "package.json": JSON.stringify({ type: "module" }),
    ...dataFiles(files),
  };
  for (const [rel, contents] of Object.entries(tree)) {
    const path = `${dir}/${rel}`;
    const slash = path.lastIndexOf("/");
    await container.fs.mkdir(path.slice(0, slash), { recursive: true }).catch(() => {});
    await container.fs.writeFile(path, contents);
  }

  const proc = await container.spawn("node", ["index.mjs"], { cwd: dir, env: DEMO_ENV });
  processes.set(app, proc);
  pipeOutput(proc.output, write);
  void proc.exit.then((code) => write(`\r\n[exit ${code}]\r\n`));
}
