/**
 * Samples for the Environment Variables guide. AWS and Service stand-ins
 * keep the fragments compiling without cloud dependencies.
 */
import type { CReactNode } from "@creact-labs/creact";

/** Cloud boundary stand-in: children deploy into the given region */
function AWS(props: { region: string; children?: CReactNode }) {
  return <>{props.children}</>;
}

/** Service stand-in configured by an API key */
function Service(_props: { apiKey?: string }) {
  return <></>;
}

// #region reading
const region = process.env.AWS_REGION ?? "us-east-1";
const apiKey = process.env.API_KEY;

function App() {
  return (
    <AWS region={region}>
      <Service apiKey={apiKey} />
    </AWS>
  );
}
// #endregion reading

export function perEnvironmentConfig() {
  // #region per-environment
  const config = {
    production: { region: "us-east-1", replicas: 3 },
    staging: { region: "us-west-2", replicas: 1 },
  };

  const env = process.env.NODE_ENV ?? "staging";
  const { region, replicas } = config[env as keyof typeof config];
  // #endregion per-environment
  return { region, replicas };
}

export { App };
