/**
 * Samples for the indexArray API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createSignal, indexArray } from "@creact-labs/creact";

export function usage() {
  // #region usage
  const [names, setNames] = createSignal(["Alice", "Bob", "Charlie"]);

  const upper = indexArray(names, (name, i) => {
    // name is an accessor, reactive to changes at index i
    return { index: i, value: name };
  });
  // #endregion usage
  setNames([]);
  return upper;
}
