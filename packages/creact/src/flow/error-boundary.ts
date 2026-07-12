/**
 * ErrorBoundary - catch and handle errors in children
 *
 * Catches errors during rendering and effect execution,
 * allowing graceful error handling without crashing the entire tree.
 *
 * For reactive fallbacks, pass an accessor function:
 * ```tsx
 * <ErrorBoundary fallback={() => <FallbackResource />}>
 * ```
 */

import type { CReactNode, JSXElement } from "../jsx/jsx-runtime";
import {
  access,
  catchError,
  createMemo,
  createSignal,
  type MaybeAccessor,
} from "../reactive/signal";
import { untrack } from "../reactive/tracking";

export interface ErrorBoundaryProps {
  /**
   * Fallback to render when error is caught.
   * Can be:
   * - Static element: `fallback={<Error />}`
   * - Accessor for reactive: `fallback={() => <Error />}`
   * - Error handler function: `fallback={(err, reset) => <Error err={err} onReset={reset} />}`
   */
  fallback:
    | MaybeAccessor<CReactNode>
    | ((err: Error, reset: () => void) => CReactNode);
  /**
   * Children to render (and catch errors from).
   * For reactive children, pass an accessor: `children={() => <Child />}`
   */
  children: MaybeAccessor<CReactNode>;
}

/**
 * Catch errors in children and render a fallback
 *
 * Usage with error handler:
 * ```tsx
 * <ErrorBoundary
 *   fallback={(err, reset) => (
 *     <FailedResource error={err.message} onRetry={reset} />
 *   )}
 * >
 *   <RiskyResource />
 * </ErrorBoundary>
 * ```
 *
 * With static fallback:
 * ```tsx
 * <ErrorBoundary fallback={<FallbackResource />}>
 *   <RiskyResource />
 * </ErrorBoundary>
 * ```
 *
 * With reactive fallback:
 * ```tsx
 * <ErrorBoundary fallback={() => <FallbackResource status={status()} />}>
 *   <RiskyResource />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundary(props: ErrorBoundaryProps): JSXElement {
  const [errored, setErrored] = createSignal<Error | undefined>(undefined);

  return createMemo(() =>
    renderBoundary(props, errored(), setErrored),
  ) as unknown as JSXElement;
}

/** Render the fallback when an error is held, otherwise guard the children */
function renderBoundary(
  props: ErrorBoundaryProps,
  e: Error | undefined,
  setErrored: (err: Error | undefined) => void,
): CReactNode {
  if (e !== undefined) {
    const f = props.fallback;
    // Check if it's an error handler function (has parameters)
    if (typeof f === "function" && (f as Function).length > 0) {
      return untrack(() =>
        (f as (err: Error, reset: () => void) => CReactNode)(e, () =>
          setErrored(undefined),
        ),
      );
    }
    // Otherwise access (handles both static and accessor)
    return access(f as MaybeAccessor<CReactNode>);
  }
  // Unwrap children in case it's an accessor
  return catchError(() => access(props.children), setErrored);
}
