/**
 * Show - conditional rendering component
 *
 * Renders children when `when` is truthy, otherwise renders fallback.
 * Children can be a static element or a function that receives the
 * truthy value as a reactive accessor.
 *
 * For reactive conditions, pass an accessor function:
 * ```tsx
 * <Show when={() => signal()}>
 * ```
 */

import type { CReactNode, JSXElement } from "../../src/jsx/jsx-runtime";
import {
  type Accessor,
  access,
  createMemo,
  type MaybeAccessor,
} from "../../src/reactive/signal";
import { untrack } from "../../src/reactive/tracking";

export interface ShowProps<T> {
  /**
   * Condition to check - children render when truthy.
   * For reactive conditions, pass an accessor: `when={() => signal()}`
   */
  when: MaybeAccessor<T | undefined | null | false>;
  /**
   * Optional fallback to render when condition is falsy.
   * For reactive fallbacks, pass an accessor: `fallback={() => <Loading />}`
   */
  fallback?: MaybeAccessor<CReactNode>;
  /** Children to render when truthy - can be element or function receiving accessor */
  children: CReactNode | ((item: Accessor<NonNullable<T>>) => CReactNode);
}

/**
 * Conditionally render content based on a truthy value
 *
 * For reactive conditions, pass an accessor function:
 * ```tsx
 * <Show when={() => user()} fallback={() => <Loading />}>
 *   {(user) => <Profile user={user()} />}
 * </Show>
 * ```
 *
 * Or with static values:
 * ```tsx
 * <Show when={isReady} fallback={<Loading />}>
 *   <Dashboard />
 * </Show>
 * ```
 */
export function Show<T>(props: ShowProps<T>): JSXElement {
  // Create memo that tracks the condition value
  const conditionValue = createMemo(() => access(props.when));

  // Create memo that only reacts to truthiness changes
  // This prevents re-renders when the value changes but truthiness stays the same
  const condition = createMemo(() => conditionValue(), undefined, {
    equals: (
      a: T | undefined | null | false,
      b: T | undefined | null | false,
    ) => !a === !b,
  });

  return createMemo(() => {
    const c = condition();
    if (c) {
      const child = props.children;
      return typeof child === "function" && (child as Function).length > 0
        ? untrack(() =>
            (child as (item: Accessor<NonNullable<T>>) => JSXElement)(
              () => conditionValue() as NonNullable<T>,
            ),
          )
        : child;
    }
    return access(props.fallback);
  }) as unknown as JSXElement;
}
