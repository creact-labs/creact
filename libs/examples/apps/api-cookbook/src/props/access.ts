/**
 * Samples for the access API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
// #region usage
import { access, type MaybeAccessor } from "@creact-labs/creact";

function useConfig(region: MaybeAccessor<string>) {
  // Works whether region is 'us-east-1' or () => 'us-east-1'
  const resolved = access(region);
  return { region: resolved };
}
// #endregion usage

export function heroSample(props: { count: MaybeAccessor<number> }) {
  // #region hero
  const value = access(props.count); // works for both 5 and () => 5
  // #endregion hero
  return value;
}

export { useConfig };
