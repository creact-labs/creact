/**
 * Samples for the createReaction API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createReaction, createSignal } from "@creact-labs/creact";

export function usage() {
  // #region usage
  const [count, setCount] = createSignal(0);

  const track = createReaction(() => {
    console.log('count changed!');
  });

  // Arm the reaction: track count()
  track(() => count());

  setCount(1); // Logs: "count changed!"
  setCount(2); // Nothing, reaction was consumed

  // Re-arm
  track(() => count());
  setCount(3); // Logs: "count changed!"
  // #endregion usage
}
