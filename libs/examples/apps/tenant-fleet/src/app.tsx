// #region read-spec
import { createEffect, createSignal, For, indexArray, onCleanup } from "@creact-labs/creact";
import type { Memory } from "@creact-labs/creact";
import { readFileSync } from "node:fs";
import { FleetStatus } from "./components/fleet-status";
import { TenantApp, tenantLedger } from "./components/tenant-app";

export type TenantSpec = { name: string; region: string; plan?: string };

function readTenantSpecs(): TenantSpec[] {
  return JSON.parse(readFileSync("./tenants.json", "utf-8")) as TenantSpec[];
}
// #endregion read-spec

// #region watch-spec
function watchTenantSpecs(pollMs: number) {
  const [tenants, setTenants] = createSignal(readTenantSpecs());
  const timer = setInterval(() => {
    try {
      const next = readTenantSpecs();
      setTenants((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    } catch {}
  }, pollMs);
  onCleanup(() => clearInterval(timer));
  return tenants;
}
// #endregion watch-spec

// #region fleet
export function App(props: { memory: Memory; stackName: string }) {
  const tenants = watchTenantSpecs(2000);
  const roster = indexArray(tenants, (tenant, slot) => {
    return () => `${slot + 1}. ${tenant().name} [${tenant().region}]`;
  });
  createEffect(() => {
    console.log(`[fleet] spec: ${roster().map((entry) => entry()).join("  ")}`);
  });
  return (
    <>
      <For each={tenants} keyFn={(tenant) => tenant.name}>
        {(tenant) => (
          <TenantApp {...tenant()} memory={tenantLedger(tenant().name)} />
        )}
      </For>
      <FleetStatus tenants={tenants} memory={props.memory} stackName={props.stackName} />
    </>
  );
}
// #endregion fleet
