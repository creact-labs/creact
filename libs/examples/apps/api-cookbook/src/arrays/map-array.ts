/**
 * Samples for the mapArray API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createSignal, mapArray } from "@creact-labs/creact";

export function usage() {
  // #region usage
  const [items, setItems] = createSignal([
    { id: 1, name: "Alpha" },
    { id: 2, name: "Beta" },
  ]);

  const names = mapArray(items, (item, i) => {
    // item is an accessor, called once per item, not re-called when item moves
    return item().name.toUpperCase();
  });

  console.log(names()); // ['ALPHA', 'BETA']
  // #endregion usage
  setItems([]);
}
