import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const Installation: Component = () => {
  return (
    <>
      <h1>Installation</h1>
      <p class="docs-description">
        Set up a new CReact project from scratch. CReact runs on Node.js and uses JSX with TypeScript.
      </p>

      <DocHeading level={2} id="requirements">Requirements</DocHeading>
      <ul>
        <li>Node.js 18.0.0 or later</li>
        <li>npm, yarn, or pnpm</li>
      </ul>

      <DocHeading level={2} id="create-project">Create a New Project</DocHeading>
      <p>Create a directory and initialize it:</p>
      <DocCodeBlock lang="bash" code={`mkdir my-app && cd my-app
npm init -y`} filename="Terminal" />

      <p>Install CReact:</p>
      <DocCodeBlock lang="bash" code={`npm install @creact-labs/creact`} filename="Terminal" />

      <p>Install TypeScript as a dev dependency:</p>
      <DocCodeBlock lang="bash" code={`npm install -D typescript @types/node`} filename="Terminal" />

      <DocHeading level={2} id="configure-typescript">Configure TypeScript</DocHeading>
      <p>Create a <code>tsconfig.json</code> with JSX configured for CReact:</p>
      <DocCodeBlock lang="json" code={`{
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
}`} filename="tsconfig.json" />

      <Callout type="tip">
        <p>
          <code>jsxImportSource</code> tells TypeScript to use CReact's JSX runtime
          instead of React's, enabling <code>&lt;Component /&gt;</code> syntax.
        </p>
      </Callout>

      <DocHeading level={2} id="add-scripts">Add Scripts</DocHeading>
      <p>
        Update your <code>package.json</code> with a module type and run scripts:
      </p>
      <DocCodeBlock lang="json" code={`{
  "type": "module",
  "scripts": {
    "start": "creact index.tsx",
    "dev": "creact --watch index.tsx"
  }
}`} filename="package.json" />

      <DocHeading level={2} id="create-entry">Create Your Entry Point</DocHeading>
      <p>Create <code>index.tsx</code>. CReact apps export a default async function that calls <code>render()</code> with a component, a <a href="#/docs/getting-started/state-and-memory">Memory</a> implementation, and a stack name:</p>
      <DocCodeBlock code={`import { render } from '@creact-labs/creact';
import { FileMemory } from './src/memory';

function App() {
  return <></>;
}

export default async function() {
  const memory = new FileMemory('./.state');
  return render(() => <App />, memory, 'my-app');
}`} filename="index.tsx" />

      <DocHeading level={2} id="run">Run the App</DocHeading>
      <DocCodeBlock lang="bash" code={`npm run dev`} filename="Terminal" />

      <p>
        Your CReact app is now running. The <code>--watch</code> flag restarts on file changes.
      </p>

      <DocHeading level={2} id="project-files">Project Structure</DocHeading>
      <DocCodeBlock lang="bash" code={`my-app/
├── index.tsx           # Entry point, exports default async function
├── src/
│   ├── app.tsx         # Root component
│   ├── memory.ts       # Memory implementation (state persistence)
│   └── components/     # Your components
├── .state/             # Persisted state (auto-generated)
├── package.json
└── tsconfig.json`} filename="Structure" />

      <p>
        The entry point (<code>index.tsx</code>) exports a default async function that the <code>creact</code> CLI calls.
        This function calls <code>render()</code> with your root component, a <a href="#/docs/getting-started/state-and-memory">Memory</a> implementation,
        and a stack name.
      </p>
    </>
  );
};

export default Installation;
