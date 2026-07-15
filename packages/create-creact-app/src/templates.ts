export type MemoryKind = "file" | "sqlite" | "memory" | "custom";

export const MEMORY_KINDS: MemoryKind[] = [
  "file",
  "sqlite",
  "memory",
  "custom",
];

const indexTsx = `import { createEffect, render, useAsyncOutput } from "@creact-labs/creact";
import { memory } from "./memory.js";

// A durable counter: it increments once a second and, with a persistent
// memory backend, picks up where it left off after a restart.
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
  return render(() => <Counter key="counter" />, memory, "my-app");
}
`;

const fileMemory = `import type { DeploymentState, Memory } from "@creact-labs/creact";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Persists each stack's state as a JSON file under ./.state.
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

export const memory: Memory = new FileMemory("./.state");
`;

const sqliteMemory = `import type { DeploymentState, Memory } from "@creact-labs/creact";
import Database from "better-sqlite3";

// Persists each stack's state as a row in a single SQLite database file.
class SqliteMemory implements Memory {
  private db: Database.Database;
  constructor(path: string) {
    this.db = new Database(path);
    this.db.exec("CREATE TABLE IF NOT EXISTS state (stack TEXT PRIMARY KEY, json TEXT NOT NULL)");
  }
  async getState(stack: string): Promise<DeploymentState | null> {
    const row = this.db
      .prepare("SELECT json FROM state WHERE stack = ?")
      .get(stack) as { json: string } | undefined;
    return row ? JSON.parse(row.json) : null;
  }
  async saveState(stack: string, state: DeploymentState): Promise<void> {
    this.db
      .prepare(
        "INSERT INTO state (stack, json) VALUES (?, ?) ON CONFLICT(stack) DO UPDATE SET json = excluded.json",
      )
      .run(stack, JSON.stringify(state));
  }
}

export const memory: Memory = new SqliteMemory("./creact.db");
`;

const inMemory = `import type { DeploymentState, Memory } from "@creact-labs/creact";

// Keeps state in a Map for the lifetime of the process. Nothing survives a
// restart — swap for the file or sqlite backend once you need persistence.
class InMemoryMemory implements Memory {
  private store = new Map<string, DeploymentState>();
  async getState(stack: string): Promise<DeploymentState | null> {
    return this.store.get(stack) ?? null;
  }
  async saveState(stack: string, state: DeploymentState): Promise<void> {
    this.store.set(stack, state);
  }
}

export const memory: Memory = new InMemoryMemory();
`;

const customMemory = `import type { DeploymentState, Memory } from "@creact-labs/creact";

// Write your own backend: implement getState/saveState against whatever you
// like — Redis, Postgres, S3, a REST API. getState returns the persisted
// state for a stack, or null on the first run; saveState persists it.
class CustomMemory implements Memory {
  async getState(stack: string): Promise<DeploymentState | null> {
    throw new Error(\`getState(\${stack}) not implemented\`);
  }
  async saveState(stack: string, state: DeploymentState): Promise<void> {
    throw new Error(\`saveState(\${stack}) not implemented\`);
  }
}

export const memory: Memory = new CustomMemory();
`;

const memoryModules: Record<MemoryKind, string> = {
  file: fileMemory,
  sqlite: sqliteMemory,
  memory: inMemory,
  custom: customMemory,
};

function packageJson(name: string, kind: MemoryKind): string {
  const dependencies: Record<string, string> = {
    "@creact-labs/creact": "^0.4.0",
  };
  const devDependencies: Record<string, string> = {
    "@types/node": "^20.0.0",
    typescript: "^5.0.0",
  };
  if (kind === "sqlite") {
    dependencies["better-sqlite3"] = "^11.0.0";
    devDependencies["@types/better-sqlite3"] = "^7.6.0";
  }
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
          typecheck: "tsc --noEmit",
        },
        dependencies,
        devDependencies,
      },
      null,
      2,
    ) + "\n"
  );
}

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
increments once a second. State is persisted by the memory backend in \`memory.ts\`.

Learn more at https://github.com/creact-labs/creact.
`;
}

function gitignore(kind: MemoryKind): string {
  const lines = ["node_modules", "dist", ".state"];
  if (kind === "sqlite") lines.push("creact.db");
  return lines.join("\n") + "\n";
}

export function projectFiles(
  name: string,
  kind: MemoryKind = "file",
): Record<string, string> {
  return {
    "index.tsx": indexTsx,
    "memory.ts": memoryModules[kind],
    "package.json": packageJson(name, kind),
    "tsconfig.json": tsconfig,
    "README.md": readme(name),
    ".gitignore": gitignore(kind),
  };
}
