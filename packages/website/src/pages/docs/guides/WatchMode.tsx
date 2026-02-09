import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const WatchMode: Component = () => {
  return (
    <>
      <h1>Watch Mode</h1>
      <p class="docs-description">
        CReact's watch mode restarts your app automatically when files change.
      </p>

      <DocHeading level={2} id="usage">Usage</DocHeading>
      <DocCodeBlock lang="bash" code={`creact --watch index.tsx`} filename="Terminal" />
      <p>
        Watch mode monitors your source files and restarts the app on changes. State is preserved
        between restarts through the Memory interface.
      </p>

      <DocHeading level={2} id="how-it-works">How It Works</DocHeading>
      <ol>
        <li>CReact starts your app normally</li>
        <li>File system watchers monitor <code>.ts</code>, <code>.tsx</code>, <code>.js</code>, and <code>.jsx</code> files</li>
        <li>When a file changes, the current run is stopped cleanly (cleanup functions execute)</li>
        <li>A new run starts, reading persisted state from memory</li>
        <li>Reconciliation ensures only changed components re-run their handlers</li>
      </ol>

      <DocHeading level={2} id="development-workflow">Development Workflow</DocHeading>
      <p>
        A typical development session:
      </p>
      <DocCodeBlock lang="bash" code={`# Start in watch mode
npm run dev

# Edit your components, app restarts automatically
# State persists across restarts
# Press Ctrl+C to stop`} filename="Terminal" />

      <DocHeading level={2} id="type-checking">Type Checking</DocHeading>
      <p>
        Watch mode runs TypeScript type checking before each restart. If type checking fails,
        the restart is aborted and errors are displayed.
      </p>

      <Callout type="tip">
        <p>
          In watch mode, CReact performs a type check pass before running your code.
          Failed type checks show clear error messages with file locations.
        </p>
      </Callout>
    </>
  );
};

export default WatchMode;
