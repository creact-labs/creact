const indexTsx = `// CReact starter — a durable counter that survives restarts.
// Run it with \`npm run dev\` (creact --watch index.tsx).
import {
  render,
  useAsyncOutput,
  createEffect,
  type DeploymentState,
  type Memory,
} from "@creact-labs/creact";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

class FileMemory implements Memory {
  constructor(private dir: string) {}
  async getState(stack: string): Promise<DeploymentState | null> {
    try {
      return JSON.parse(await readFile(join(this.dir, \`\${stack}.json\`), "utf-8"));
    } catch {
      return null;
    }
  }
  async saveState(stack: string, state: DeploymentState): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, \`\${stack}.json\`), JSON.stringify(state, null, 2));
  }
}

function Counter() {
  const counter = useAsyncOutput<{ count: number }>({}, async (_props, setOutputs) => {
    setOutputs((prev) => ({ count: prev?.count ?? 0 }));
    const interval = setInterval(() => setOutputs((prev) => ({ count: (prev?.count ?? 0) + 1 })), 1000);
    return () => clearInterval(interval);
  });
  createEffect(() => console.log("Count:", counter.count()));
  return <></>;
}

export default async function () {
  return render(() => <Counter key="counter" />, new FileMemory("./.state"), "my-app");
}
`;

function packageJson(name: string): string {
  return (
    JSON.stringify(
      {
        name,
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "creact --watch index.tsx",
          start: "creact index.tsx",
          build: "vite build",
          typecheck: "tsc --noEmit",
        },
        dependencies: {
          "@creact-labs/creact": "^0.4.0",
        },
        devDependencies: {
          "@creact-labs/vite-plugin": "^0.4.0",
          typescript: "^5.0.0",
          vite: "^6.0.0",
        },
      },
      null,
      2,
    ) + "\n"
  );
}

const viteConfig = `import { defineConfig } from "vite";
import { creact } from "@creact-labs/vite-plugin";

export default defineConfig({
  plugins: [creact()],
});
`;

const tsconfig =
  JSON.stringify(
    {
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        jsxImportSource: "@creact-labs/creact",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
      },
      include: ["**/*.ts", "**/*.tsx"],
      exclude: ["node_modules", "dist"],
    },
    null,
    2,
  ) + "\n";

function readme(name: string): string {
  return `# ${name}

A [CReact](https://github.com/creact-labs/creact) app. Use JSX to automate durable
workflows — declare what should exist, and the runtime reconciles the difference.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

\`npm run dev\` runs \`index.tsx\` in watch mode. The starter is a durable counter that
increments once a second and survives restarts — stop it and start it again, and the
count picks up where it left off.

Learn more at https://github.com/creact-labs/creact.
`;
}

const gitignore = `node_modules
dist
.state
`;

export function projectFiles(name: string): Record<string, string> {
  return {
    "index.tsx": indexTsx,
    "package.json": packageJson(name),
    "vite.config.ts": viteConfig,
    "tsconfig.json": tsconfig,
    "README.md": readme(name),
    ".gitignore": gitignore,
  };
}
