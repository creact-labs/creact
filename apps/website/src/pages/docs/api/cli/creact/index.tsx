import type { Component } from "solid-js";
import DocHeading from "@/shared/components/doc-heading";
import DocCodeBlock from "@/shared/components/doc-code-block";
import DocTable from "@/shared/components/doc-table";

const CreactCli: Component = () => {
  return (
    <>
      <h1>creact</h1>
      <p class="docs-description">
        The CReact CLI. Type-checks and runs your entry point with state
        persistence.
      </p>

      <DocHeading level={2} id="usage">
        Usage
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={`creact <entry-file>`}
        filename="Terminal"
      />

      <DocHeading level={2} id="arguments">
        Arguments
      </DocHeading>
      <DocTable
        headers={["Argument", "Description"]}
        rows={[
          [<><code>&lt;entry-file&gt;</code></>, <>Path to the entry TypeScript/TSX file (e.g. <code>index.tsx</code>
              ).</>],
        ]}
      />

      <DocHeading level={2} id="options">
        Options
      </DocHeading>
      <DocTable
        headers={["Flag", "Description"]}
        rows={[
          [<><code>--watch</code></>, "Watch source files and restart on changes."],
          [<><code>--help</code></>, "Show help message."],
        ]}
      />

      <DocHeading level={2} id="examples">
        Examples
      </DocHeading>
      <DocCodeBlock
        lang="bash"
        code={`# Single run
creact index.tsx

# Watch mode
creact --watch index.tsx

# Via npm scripts
npm run start    # "creact index.tsx"
npm run dev      # "creact --watch index.tsx"`}
        filename="Terminal"
      />

      <DocHeading level={2} id="behavior">
        Behavior
      </DocHeading>
      <ol>
        <li>
          Runs TypeScript type checking on your project (skipped if TypeScript
          is not installed)
        </li>
        <li>
          If type checking passes, executes the entry file using{" "}
          <code>tsx</code>
        </li>
        <li>The entry file's default export (an async function) is called</li>
        <li>
          The render cycle runs: build tree, reconcile, run handlers, save state
        </li>
        <li>In single-run mode, exits after completion</li>
      </ol>
    </>
  );
};

export default CreactCli;
