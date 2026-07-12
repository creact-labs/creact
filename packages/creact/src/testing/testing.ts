/**
 * Shared test utilities (multiple consumers across subsystem test suites →
 * lives in src/testing per the universal placement rule).
 */

/** Create a JSX element without the automatic transform */
export function h(
  type: any,
  props?: Record<string, any>,
  key?: string | number,
) {
  return { type, props: props || {}, key };
}

/** Await a real timer — for handlers that simulate async work */
export const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
