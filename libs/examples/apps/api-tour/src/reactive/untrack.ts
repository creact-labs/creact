/**
 * Samples for the untrack API page. Each region is displayed by the website;
 * wrapping functions keep every fragment compiling for real.
 */
import { createEffect, createSignal, untrack } from "@creact-labs/creact";

const [signal] = createSignal(0);

export function hero() {
  // #region hero
  const value = untrack(() => signal());
  // #endregion hero
  return value;
}

export function usage() {
  const [a] = createSignal(1);
  const [b] = createSignal(2);
  // #region usage
  createEffect(() => {
    // Re-runs when a() changes, but NOT when b() changes
    console.log(a(), untrack(() => b()));
  });
  // #endregion usage
}
