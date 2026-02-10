import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const Deploying: Component = () => {
  return (
    <>
      <h1>Deploying</h1>
      <p class="docs-description">
        Run CReact apps in production with state persistence and proper process
        management.
      </p>

      <DocHeading level={2} id="production-run">
        Running in Production
      </DocHeading>
      <p>
        Use the <code>start</code> script (without <code>--watch</code>) for
        production:
      </p>
      <DocCodeBlock lang="bash" code={`npm run start`} filename="Terminal" />
      <p>
        This runs your entry point once. CReact reconciles the current component
        tree against persisted state, applies changes, saves the new state, and
        exits.
      </p>

      <DocHeading level={2} id="ci-cd">
        CI/CD Integration
      </DocHeading>
      <p>
        CReact apps work well in CI/CD pipelines. The app reads previous state,
        reconciles, deploys changes, and writes new state, all in a single run.
      </p>
      <DocCodeBlock
        lang="bash"
        code={`# GitHub Actions example
- name: Deploy infrastructure
  run: npx creact index.tsx
  env:
    AWS_ACCESS_KEY_ID: \${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: \${{ secrets.AWS_SECRET_ACCESS_KEY }}`}
        filename=".github/workflows/deploy.yml"
      />

      <DocHeading level={2} id="state-storage">
        State Storage
      </DocHeading>
      <p>
        For production, store state in a remote backend instead of the local
        file system. Implement the <code>Memory</code> interface for your
        storage:
      </p>
      <ul>
        <li>
          <strong>S3:</strong> store state JSON in an S3 bucket
        </li>
        <li>
          <strong>DynamoDB:</strong> use a table for concurrent-safe state
        </li>
        <li>
          <strong>Database:</strong> PostgreSQL, Redis, etc.
        </li>
      </ul>

      <DocHeading level={2} id="watch-mode">
        Long-Running with Watch Mode
      </DocHeading>
      <p>
        For apps that should run continuously (like servers or monitors), use
        watch mode:
      </p>
      <DocCodeBlock
        lang="bash"
        code={`creact --watch index.tsx`}
        filename="Terminal"
      />
      <p>
        Watch mode restarts the app when source files change, preserving state
        between restarts.
      </p>

      <Callout type="tip">
        <p>
          For long-running processes, use PM2 or systemd to manage restarts and
          logging.
        </p>
      </Callout>
    </>
  );
};

export default Deploying;
