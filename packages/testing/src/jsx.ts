/**
 * Create a JSX element without the automatic transform — for test files
 * written in plain .ts where JSX syntax is unavailable.
 */
export function h(
  type: unknown,
  props?: Record<string, unknown>,
  key?: string | number,
) {
  return { type, props: props || {}, key };
}
