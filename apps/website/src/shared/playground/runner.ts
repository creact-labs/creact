import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { bootWebContainer, pipeOutput } from "./webcontainer";
import { compileTsx } from "./compile";
import { baseFiles, RUNNER } from "./project";
import inspectorSource from "./demos/inspector.mjs?raw";

let basePromise: Promise<WebContainer> | undefined;
const processes = new Map<string, WebContainerProcess>();

function fetchRuntime(): Promise<Record<string, string>> {
  return fetch(`${import.meta.env.BASE_URL}creact-runtime.json`).then((res) =>
    res.json(),
  );
}

// Boot the container and mount the shared base (node_modules + package.json)
// exactly once, no matter how many examples are on the page.
function ensureBase(): Promise<WebContainer> {
  if (!basePromise) {
    basePromise = (async () => {
      const [container, runtime] = await Promise.all([
        bootWebContainer(),
        fetchRuntime(),
      ]);
      await container.mount(baseFiles(runtime));
      return container;
    })();
  }
  return basePromise;
}

// Compile a demo and run it in its own directory as a fresh `node` process,
// streaming output to `write`. Each example on the page gets an isolated dir
// so many can run at once against the one shared runtime.
export async function runSource(
  id: string,
  source: string,
  write: (chunk: string) => void,
): Promise<void> {
  const [container, compiled] = await Promise.all([
    ensureBase(),
    compileTsx(source),
  ]);

  processes.get(id)?.kill();

  const dir = `run-${id}`;
  await container.fs.mkdir(dir, { recursive: true }).catch(() => {});
  await Promise.all([
    container.fs.writeFile(`${dir}/inspector.mjs`, inspectorSource),
    container.fs.writeFile(`${dir}/app.mjs`, compiled),
    container.fs.writeFile(`${dir}/index.mjs`, RUNNER),
  ]);

  const proc = await container.spawn("node", ["index.mjs"], { cwd: dir });
  processes.set(id, proc);
  pipeOutput(proc.output, write);
}
