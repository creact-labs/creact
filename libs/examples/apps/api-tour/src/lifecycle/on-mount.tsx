/**
 * Samples for the onMount API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { onMount } from "@creact-labs/creact";

export function heroSample() {
  // #region hero
  onMount(() => {
    console.log("Component mounted");
  });
  // #endregion hero
}

// #region usage
function App() {
  onMount(() => {
    console.log("App started");
  });

  return <></>;
}
// #endregion usage

export { App };
