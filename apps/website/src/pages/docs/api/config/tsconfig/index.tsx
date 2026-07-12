import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import DocCodeBlock from "@/shared/components/doc-code-block";
import Callout from "@/shared/components/callout";
import DocTable from "@/shared/components/doc-table";

const Tsconfig: Component = () => {
  return (
    <>
      <h1>tsconfig.json</h1>
      <p class="docs-description">
        TypeScript configuration for CReact projects.
      </p>

      <DocHeading level={2} id="recommended">
        Recommended Configuration
      </DocHeading>
      <DocCodeBlock
        lang="json"
        code={`{
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
}`}
        filename="tsconfig.json"
      />

      <DocHeading level={2} id="key-settings">
        Key Settings
      </DocHeading>
      <DocTable
        headers={["Setting", "Value", "Why"]}
        rows={[
          [<><code>jsx</code></>, <><code>"react-jsx"</code></>, "Uses the automatic JSX transform (no manual imports needed)."],
          [<><code>jsxImportSource</code></>, <><code>"@creact-labs/creact"</code></>, "Points JSX to CReact's runtime instead of React's."],
          [<><code>target</code></>, <><code>"ES2022"</code></>, "CReact requires Node 18+ which supports ES2022."],
          [<><code>module</code></>, <><code>"ESNext"</code></>, "CReact is ESM-only."],
          [<><code>moduleResolution</code></>, <><code>"bundler"</code></>, "Best for modern ESM projects."],
        ]}
      />

      <Callout type="info">
        <p>
          The <code>creact</code> CLI uses <code>tsx</code> internally, so you
          don't need to compile TypeScript separately for development.
        </p>
      </Callout>
    </>
  );
};

export default Tsconfig;
