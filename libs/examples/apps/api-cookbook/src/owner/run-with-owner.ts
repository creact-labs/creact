/**
 * Samples for the runWithOwner API page. Each region is displayed by the
 * website; the module compiles for real, imports included.
 */
// #region usage
import { createEffect, getOwner, runWithOwner } from "@creact-labs/creact";

function setup() {
  // getOwner() returns Owner | null — null outside a reactive scope
  const owner = getOwner();
  if (!owner) return; // nothing to restore later

  setTimeout(() => {
    // Without runWithOwner, this effect would have no owner
    runWithOwner(owner, () => {
      createEffect(() => {
        console.log("Works in async context");
      });
    });
  }, 1000);
}
// #endregion usage

export { setup };
