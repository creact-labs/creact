// #region context
import { S3Client } from "@creact-labs/example-mock-s3";
import {
  children,
  createContext,
  onCleanup,
  useContext,
  type JSXElement,
} from "@creact-labs/creact";

export interface AwsConnection {
  region: string;
  client: S3Client;
}

const AwsContext = createContext<AwsConnection | null>(null);
// #endregion context

// #region provider
export function AwsProvider(props: { region: string; children: JSXElement }) {
  const client = new S3Client({ region: props.region });
  onCleanup(() => client.destroy());
  const resolved = children(() => props.children);
  return (
    <AwsContext.Provider value={{ region: props.region, client }}>
      {resolved()}
    </AwsContext.Provider>
  );
}
// #endregion provider

// #region use-aws
export function useAws(): AwsConnection {
  const connection = useContext(AwsContext);
  if (!connection) {
    throw new Error("useAws must be called inside <AwsProvider>");
  }
  return connection;
}
// #endregion use-aws
