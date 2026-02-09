import type { Component } from "solid-js";
import DocHeading from "../../../../components/docs/DocHeading";
import DocCodeBlock from "../../../../components/docs/DocCodeBlock";

const CreactCli: Component = () => {
  return (
    <>
      <h1>creact</h1>
      <p class="docs-description">The CReact CLI. Type-checks and runs your entry point with state persistence.</p>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock lang="bash" code={`creact <entry-file>`} filename="Terminal" />

      <DocHeading level={2} id="arguments">Arguments</DocHeading>
      <table>
        <thead><tr><th>Argument</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>&lt;entry-file&gt;</code></td><td>Path to the entry TypeScript/TSX file (e.g. <code>index.tsx</code>).</td></tr>
        </tbody>
      </table>

      <DocHeading level={2} id="options">Options</DocHeading>
      <table>
        <thead><tr><th>Flag</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>--watch</code></td><td>Watch source files and restart on changes.</td></tr>
          <tr><td><code>--help</code></td><td>Show help message.</td></tr>
        </tbody>
      </table>

      <DocHeading level={2} id="examples">Examples</DocHeading>
      <DocCodeBlock lang="bash" code={`# Single run
creact index.tsx

# Watch mode
creact --watch index.tsx

# Via npm scripts
npm run start    # "creact index.tsx"
npm run dev      # "creact --watch index.tsx"`} filename="Terminal" />

      <DocHeading level={2} id="behavior">Behavior</DocHeading>
      <ol>
        <li>Runs TypeScript type checking on your project (skipped if TypeScript is not installed)</li>
        <li>If type checking passes, executes the entry file using <code>tsx</code></li>
        <li>The entry file's default export (an async function) is called</li>
        <li>The render cycle runs: build tree, reconcile, run handlers, save state</li>
        <li>In single-run mode, exits after completion</li>
      </ol>
    </>
  );
};

export default CreactCli;
