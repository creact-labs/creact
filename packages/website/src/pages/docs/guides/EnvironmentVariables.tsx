import type { Component } from "solid-js";
import DocHeading from "../../../components/docs/DocHeading";
import DocCodeBlock from "../../../components/docs/DocCodeBlock";
import Callout from "../../../components/docs/Callout";

const EnvironmentVariables: Component = () => {
  return (
    <>
      <h1>Environment Variables</h1>
      <p class="docs-description">
        Configure your app for different environments using process.env.
      </p>

      <DocHeading level={2} id="reading">
        Reading Environment Variables
      </DocHeading>
      <p>
        Access environment variables through <code>process.env</code> as in any
        Node.js app:
      </p>
      <DocCodeBlock
        code={`const region = process.env.AWS_REGION ?? 'us-east-1';
const apiKey = process.env.API_KEY;

function App() {
  return (
    <AWS region={region}>
      <Service apiKey={apiKey} />
    </AWS>
  );
}`}
        filename="app.tsx"
      />

      <DocHeading level={2} id="per-environment">
        Per-Environment Configuration
      </DocHeading>
      <DocCodeBlock
        code={`const config = {
  production: { region: 'us-east-1', replicas: 3 },
  staging: { region: 'us-west-2', replicas: 1 },
};

const env = process.env.NODE_ENV ?? 'staging';
const { region, replicas } = config[env as keyof typeof config];`}
        filename="config.ts"
      />

      <DocHeading level={2} id="secrets">
        Handling Secrets
      </DocHeading>
      <p>Pass secrets via environment variables or a secret manager:</p>
      <DocCodeBlock
        lang="bash"
        code={`# .env (add to .gitignore)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
ANTHROPIC_API_KEY=sk-ant-...`}
        filename=".env"
      />

      <Callout type="warning">
        <p>
          CReact does not have built-in <code>.env</code> file loading. Use a
          package like <code>dotenv</code>
          or set variables in your shell / CI environment.
        </p>
      </Callout>
    </>
  );
};

export default EnvironmentVariables;
