import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";

const PackageJson: Component = () => {
  return (
    <>
      <h1>package.json</h1>
      <p class="docs-description">Package configuration for CReact projects.</p>

      <DocHeading level={2} id="minimal">Minimal Configuration</DocHeading>
      <DocCodeBlock lang="json" code={`{
  "name": "my-creact-app",
  "type": "module",
  "scripts": {
    "start": "creact index.tsx",
    "dev": "creact --watch index.tsx"
  },
  "dependencies": {
    "@creact-labs/creact": "^0.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}`} filename="package.json" />

      <DocHeading level={2} id="key-fields">Key Fields</DocHeading>
      <table>
        <thead><tr><th>Field</th><th>Value</th><th>Why</th></tr></thead>
        <tbody>
          <tr><td><code>"type"</code></td><td><code>"module"</code></td><td>CReact is ESM-only. Required for proper module resolution.</td></tr>
          <tr><td><code>"scripts.start"</code></td><td><code>"creact index.tsx"</code></td><td>Single run: reconcile and exit.</td></tr>
          <tr><td><code>"scripts.dev"</code></td><td><code>"creact --watch index.tsx"</code></td><td>Watch mode: restarts on file changes.</td></tr>
        </tbody>
      </table>

      <DocHeading level={2} id="with-testing">With Testing</DocHeading>
      <DocCodeBlock lang="json" code={`{
  "scripts": {
    "start": "creact index.tsx",
    "dev": "creact --watch index.tsx",
    "test": "vitest --run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "vitest": "^3.0.0"
  }
}`} filename="package.json" />
    </>
  );
};

export default PackageJson;
