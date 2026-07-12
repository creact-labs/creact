/**
 * Shared test utilities for the @creact-labs/testing suites
 * (multiple sibling consumers → src/testing per the universal placement rule).
 */

/** Create a JSX element without the automatic transform */
export function h(
  type: any,
  props?: Record<string, any>,
  key?: string | number,
) {
  return { type, props: props || {}, key };
}
