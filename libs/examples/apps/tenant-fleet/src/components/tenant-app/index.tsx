// #region tree
import { createRuntime, mergeProps, splitProps, useAsyncOutput } from "@creact-labs/creact";
import type { Memory } from "@creact-labs/creact";
import { FileMemory } from "@creact-labs/example-file-memory";

export type TenantTreeProps = { name: string; region: string; plan?: string };

function TenantTree(props: TenantTreeProps) {
  const tenant = mergeProps({ plan: "starter" }, props) as Required<TenantTreeProps>;
  return (
    <TenantDatabase key="database" name={tenant.name} region={tenant.region} plan={tenant.plan} />
  );
}
// #endregion tree

// #region database
function TenantDatabase(props: { name: string; region: string; plan: string }) {
  const [placement, service] = splitProps(props, ["name", "region"]);
  const db = useAsyncOutput<
    { connectionString: string; provisionedAt: string },
    { name: string; region: string }
  >({ name: placement.name, region: placement.region }, async (spec, setOutputs) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    setOutputs((prev) => ({
      connectionString: `postgres://${spec.name}.${spec.region}.fleet.internal:5432/${spec.name}`,
      provisionedAt: prev?.provisionedAt ?? new Date().toISOString(),
    }));
  });
  return (
    <TenantApi key="api" name={placement.name} plan={service.plan} connection={db.connectionString} />
  );
}
// #endregion database

// #region api
function TenantApi(props: { name: string; plan: string; connection: () => string | undefined }) {
  useAsyncOutput<
    { endpoint: string; database: string; requestsPerMinute: number },
    { name: string; plan: string; connection: string | undefined }
  >(
    () => ({ name: props.name, plan: props.plan, connection: props.connection() }),
    async (api, setOutputs) => {
      setOutputs({
        endpoint: `https://${api.name}.fleet.dev`,
        database: api.connection!,
        requestsPerMinute: api.plan === "enterprise" ? 10000 : api.plan === "pro" ? 1000 : 100,
      });
    },
  );
  return <></>;
}
// #endregion api

// #region runtime-wrap
export const TenantApp = createRuntime(TenantTree);

export function tenantLedger(name: string): Memory {
  return new FileMemory(`./ledgers/${name}`);
}
// #endregion runtime-wrap
