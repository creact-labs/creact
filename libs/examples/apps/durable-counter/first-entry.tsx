/**
 * The "Create Your Entry Point" sample from the installation page — the
 * tutorial project's index.tsx at its very first stage, before src/app.tsx
 * exists. Kept as a sibling of the real entry so `./src/memory` resolves
 * exactly as it does in a reader's project.
 */
// #region entry-point
import { render } from "@creact-labs/creact";
import { FileMemory } from "./src/memory";

function App() {
  return <></>;
}

export default async function () {
  const memory = new FileMemory("./.state");
  return render(() => <App />, memory, "my-app");
}
// #endregion entry-point
