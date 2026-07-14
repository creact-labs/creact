// #region project
import { createEffect, createMemo, createSignal, mapArray, onCleanup } from "@creact-labs/creact";
import type { DeploymentState, Memory, RuntimeOutputs } from "@creact-labs/creact";
import type { TenantSpec } from "../../app";

const tenantRuntimePrefix = "tenant-tree-runtime-";

export function projectFleet(state: DeploymentState): Record<string, RuntimeOutputs> {
  const fleet: Record<string, RuntimeOutputs> = {};
  for (const node of state.nodes) {
    if (node.id.startsWith(tenantRuntimePrefix) && node.outputs) {
      fleet[node.id.slice(tenantRuntimePrefix.length)] = node.outputs as unknown as RuntimeOutputs;
    }
  }
  return fleet;
}

export function describeTenant(tenant: TenantSpec, runtime?: RuntimeOutputs): string {
  if (!runtime) return `${tenant.name}: attaching`;
  return `${tenant.name}: ${runtime.status}${runtime.error ? `, ${runtime.error}` : ""}`;
}
// #endregion project

// #region summary
export function FleetStatus(props: { tenants: () => TenantSpec[]; memory: Memory; stackName: string }) {
  const [fleet, setFleet] = createSignal<Record<string, RuntimeOutputs>>({});
  const timer = setInterval(async () => {
    const state = await props.memory.getState(props.stackName);
    if (!state) return;
    const next = projectFleet(state);
    setFleet((current) =>
      JSON.stringify(current) === JSON.stringify(next) ? current : next,
    );
  }, 1000);
  onCleanup(() => clearInterval(timer));
  const lines = mapArray(props.tenants, (tenant) =>
    createMemo(() => describeTenant(tenant(), fleet()[tenant().name])),
  );
  createEffect(() => {
    console.log(`[fleet] ${lines().map((line) => line()).join(" | ")}`);
  });
  return <></>;
}
// #endregion summary
