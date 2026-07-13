/**
 * Samples for the mergeProps API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createEffect, mergeProps } from "@creact-labs/creact";

export function heroSample(props: { color?: string; size?: string }) {
  // #region hero
  const merged = mergeProps({ color: "blue", size: "md" }, props);
  // #endregion hero
  return merged;
}

// #region usage
function Button(props: { color?: string; size?: string; label: string }) {
  const merged = mergeProps({ color: "blue", size: "md" }, props);

  createEffect(() => {
    console.log(merged.color, merged.size, merged.label);
  });

  return <></>;
}
// #endregion usage

export { Button };
