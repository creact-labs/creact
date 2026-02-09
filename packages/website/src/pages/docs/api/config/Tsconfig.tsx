import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";
import Callout from "../../../../components/docs/Callout";

const Tsconfig: Component = () => {
  return (
    <>
      <h1>tsconfig.json</h1>
      <p class="docs-description">TypeScript configuration for CReact projects.</p>

      <DocHeading level={2} id="recommended">Recommended Configuration</DocHeading>
      <DocCodeBlock lang="json" code={`{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "@creact-labs/creact",
    "strict": true,
    "outDir": "dist",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["index.tsx", "src"]
}`} filename="tsconfig.json" />

      <DocHeading level={2} id="key-settings">Key Settings</DocHeading>
      <table>
        <thead><tr><th>Setting</th><th>Value</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td><code>jsx</code></td><td><code>"react-jsx"</code></td><td>Uses the automatic JSX transform (no manual imports needed).</td></tr>
          <tr><td><code>jsxImportSource</code></td><td><code>"@creact-labs/creact"</code></td><td>Points JSX to CReact's runtime instead of React's.</td></tr>
          <tr><td><code>target</code></td><td><code>"ES2022"</code></td><td>CReact requires Node 18+ which supports ES2022.</td></tr>
          <tr><td><code>module</code></td><td><code>"ESNext"</code></td><td>CReact is ESM-only.</td></tr>
          <tr><td><code>moduleResolution</code></td><td><code>"bundler"</code></td><td>Best for modern ESM projects.</td></tr>
        </tbody>
      </table>

      <Callout type="info">
        <p>
          The <code>creact</code> CLI uses <code>tsx</code> internally, so you don't need to
          compile TypeScript separately for development.
        </p>
      </Callout>
    </>
  );
};

export default Tsconfig;
