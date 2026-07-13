/**
 * Samples for the createRuntime API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import type { Memory } from "@creact-labs/creact";

function App(props: { region: string }) {
  void props;
  return <></>;
}

// #region hero
import { createRuntime } from "@creact-labs/creact";

const TenantApp = createRuntime(App);

<TenantApp key="tenant-a" region="us-east-1" />;
// #endregion hero

export function fleet(tenantBMemory: Memory) {
  // #region usage
  const TenantApp = createRuntime(App);

  function Fleet() {
    return (
      <>
        {/* memory omitted → inherits the parent runtime's backend */}
        <TenantApp key="tenant-a" region="us-east-1" />
        {/* memory supplied → sovereign ledger */}
        <TenantApp key="tenant-b" region="eu-west-1" memory={tenantBMemory} />
      </>
    );
  }
  // #endregion usage
  return Fleet;
}
