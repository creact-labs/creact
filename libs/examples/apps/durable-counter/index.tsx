// #region entry-point
import { render } from "@creact-labs/creact";
import { FileMemory } from "@creact-labs/example-file-memory";
import { App } from "./src/app";

export default async function () {
  const memory = new FileMemory("./.state");
  return render(() => <App />, memory, "durable-counter");
}
// #endregion entry-point
