import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocTable from "@/shared/components/doc-table";

const PackageJson: Component = () => {
  return (
    <>
      <h1>package.json</h1>
      <p class="docs-description">Package configuration for CReact projects.</p>

      <DocHeading level={2} id="minimal">
        Minimal Configuration
      </DocHeading>
      <DocCodeBlock
        lang="json"
        code={`{
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
}`}
        filename="package.json"
      />

      <DocHeading level={2} id="key-fields">
        Key Fields
      </DocHeading>
      <DocTable
        headers={["Field", "Value", "Why"]}
        rows={[
          [<><code>"type"</code></>, <><code>"module"</code></>, "CReact is ESM-only. Required for proper module resolution."],
          [<><code>"scripts.start"</code></>, <><code>"creact index.tsx"</code></>, "Single run: reconcile and exit."],
          [<><code>"scripts.dev"</code></>, <><code>"creact --watch index.tsx"</code></>, "Watch mode: restarts on file changes."],
        ]}
      />

      <DocHeading level={2} id="with-testing">
        With Testing
      </DocHeading>
      <DocCodeBlock
        lang="json"
        code={`{
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
}`}
        filename="package.json"
      />
    </>
  );
};

export default PackageJson;
