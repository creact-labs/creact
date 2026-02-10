# Chapter 1: Your First CReact App

In this chapter, we'll build a simple counter that ticks every second to show case application state persistence in CReact.

This enables us to stop the app, restart it, and continue from where we left off.

Let's get started:

---

## Setting Up Your Project

First, create a new directory and initialize it:

```bash
mkdir my-app && cd my-app
npm init -y
npm install @creact-labs/creact
npm install -D typescript @types/node
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "@creact-labs/creact",
    "strict": true,
    "outDir": "dist"
  },
  "include": ["index.tsx", "src"]
}
```

Add these scripts to `package.json`

```json
{
  "type": "module",
  "scripts": {
    "start": "creact index.tsx",
    "dev": "creact --watch index.tsx"
  }
}
```

---

## Teaching CReact Where to Store State

CReact needs to know where to persist your application state. We call this a "Memory" implementation. For this example, we'll use a simple file-based approach.

Create `src/memory.ts`:

```tsx
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Memory, DeploymentState } from "@creact-labs/creact";

export class FileMemory implements Memory {
  constructor(private directory: string) {}

  async getState(stackName: string): Promise<DeploymentState | null> {
    try {
      const path = join(this.directory, `${stackName}.json`);
      const data = await readFile(path, "utf-8");
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const path = join(this.directory, `${stackName}.json`);
    await writeFile(path, JSON.stringify(state, null, 2));
  }
}
```

This tells CReact to save state as JSON files in a `.state/` directory.

---

## Building the Counter

Now we get to the core of CReact: the `useAsyncOutput` hook.

This hook creates a resource with outputs that CReact automatically persists. It takes two arguments: props and a handler function. The handler receives `setOutputs`, which works like React's `setState`—pass it a function to get the previous value and build on it.

Notice that `prev?.count` isn't just the previous value from this session—it's the value from the _last time the app ran_. CReact restores it automatically.

We also use `createEffect` to react to changes. It runs whenever its dependencies change, in this case `counter.count()`.

Create `src/app.tsx`:

```tsx
import { useAsyncOutput, createEffect } from "@creact-labs/creact";

export function App() {
  const counter = useAsyncOutput({}, async (_props, setOutputs) => {
    // Start from previous value, or 0 if this is the first run
    setOutputs((prev) => ({ count: prev?.count ?? 0 }));

    // Tick every second
    const interval = setInterval(() => {
      setOutputs((prev) => ({ count: (prev?.count ?? 0) + 1 }));
    }, 1000);

    // Clean up when the app stops
    return () => clearInterval(interval);
  });

  // React to changes
  createEffect(() => {
    console.log("Count:", counter.count());
  });

  return <></>;
}
```

The cleanup function at the end prevents memory leaks by clearing the interval when the app stops.

---

## Wiring It Together

Finally, create the entry point. Create `index.tsx`:

```tsx
import { render } from "@creact-labs/creact";
import { FileMemory } from "./src/memory";
import { App } from "./src/app";

export default async function () {
  const memory = new FileMemory("./.state");
  return render(() => <App />, memory, "my-app");
}
```

The entry point exports a default function that the CLI calls. The third argument (`'my-app'`) identifies your app's state

---

Your project structure will look like this:

```
my-app/
├── index.tsx         # Entry point
├── src/
│   ├── app.tsx       # Your app
│   └── memory.ts     # Where state lives
├── package.json
└── tsconfig.json
```

## See It In Action

Run your app:

```bash
npm run dev
```

You'll see:

```
Count: 0
Count: 1
Count: 2
Count: 3
...
```

Now **press Ctrl+C** to stop it. Wait a moment. Run it again:

```bash
npm run dev
```

```
Count: 4
Count: 5
Count: 6
...
```

It continued from where it left off.

Take a peek at `.state/my-app.json` to see your persisted state. That's your app's memory, saved automatically.

---

## What Just Happened?

You built an app that:

1. **Persists state automatically** — outputs are saved whenever they change
2. **Restores on restart** — `setOutputs(prev => ...)` receives the last saved value
3. **Cleans up properly** — the cleanup function prevents orphaned intervals
4. **Reacts to changes** — `createEffect` runs whenever dependencies change

---

The counter stores and restores a single number. [Chapter 2](./02-hello-world.md) deploys a website to AWS with the same persistence model.
