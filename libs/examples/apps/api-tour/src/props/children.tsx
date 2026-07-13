/**
 * Samples for the children API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { children, createEffect, type JSXElement } from "@creact-labs/creact";

export function heroSample(props: { children: JSXElement }) {
  // #region hero
  const resolved = children(() => props.children);
  // #endregion hero
  return resolved;
}

// #region usage
function Wrapper(props: { children: JSXElement }) {
  const c = children(() => props.children);

  createEffect(() => {
    const resolved = c();
    console.log("Children:", resolved);
  });

  return <></>;
}
// #endregion usage

export { Wrapper };
