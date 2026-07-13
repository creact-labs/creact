/**
 * Getting-started tour: a full CReact app whose modules hold every code
 * sample shown on the getting-started docs pages. Run it with
 * `creact index.tsx`; CI typechecks it, so no published sample can rot.
 *
 * This entry is itself the "Passing Memory to render()" sample from the
 * state-and-memory page.
 */
// #region using-memory
import { render } from "@creact-labs/creact";
import { FileMemory } from "./src/memory";
import { App } from "./src/app";

export default async function () {
  const memory = new FileMemory("./.state");
  return render(() => <App />, memory, "my-app");
}
// #endregion using-memory
