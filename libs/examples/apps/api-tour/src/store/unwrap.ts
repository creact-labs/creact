/**
 * Samples for the unwrap API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createStore, unwrap } from "@creact-labs/creact";

export function usage() {
  // #region usage
  const [store, setStore] = createStore({ count: 0 });
  const plain = unwrap(store);

  // plain is a regular object, not reactive
  console.log(plain); // { count: 0 }

  // Useful for serialization
  JSON.stringify(unwrap(store));
  // #endregion usage
  setStore("count", plain.count);
}
