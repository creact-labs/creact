// #region entry-point
import { render } from "@creact-labs/creact";
import { FileMemory } from "@creact-labs/example-file-memory";
import { App } from "./src/app";

const fleetStack = "tenant-fleet";

export default async function () {
  const fleetLedger = new FileMemory("./ledgers/fleet");
  const fleet = render(
    () => <App memory={fleetLedger} stackName={fleetStack} />,
    fleetLedger,
    fleetStack,
  );
  await fleet.ready;
  await fleet.settled();
  return fleet;
}
// #endregion entry-point
