/**
 * Samples for the createRenderEffect API page. Each region is displayed by
 * the website; wrapping functions keep every fragment compiling for real.
 */
import { createRenderEffect, createSignal } from "@creact-labs/creact";

export function usage() {
  const [value, setValue] = createSignal("ready");
  // #region usage
  createRenderEffect(() => {
    // Runs synchronously during component initialization
    // and again whenever dependencies change
    console.log('Render-phase:', value());
  });
  // #endregion usage
  setValue("updated");
}
