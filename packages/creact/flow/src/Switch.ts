/**
 * Switch/Match - multi-way conditional rendering
 *
 * Like a switch statement for JSX. Renders the first Match
 * whose `when` condition is truthy.
 *
 * For reactive conditions, pass accessor functions:
 * ```tsx
 * <Switch fallback={() => <Default />}>
 *   <Match when={() => status() === 'loading'}>
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

// Symbol to identify Match components
const MATCH_SYMBOL = Symbol("Match");

export interface MatchProps<T> {
  /**
   * Condition to check.
   * For reactive conditions, pass an accessor: `when={() => signal()}`
   */
  when: MaybeAccessor<T | undefined | null | false>;
  /** Children to render when this is the first truthy match */
  children: CReactNode | ((item: Accessor<NonNullable<T>>) => CReactNode);
}

export interface SwitchProps {
  /**
   * Optional fallback when no Match conditions are truthy.
   * For reactive fallbacks, pass an accessor: `fallback={() => <Default />}`
   */
  fallback?: MaybeAccessor<CReactNode>;
  /** Match components as children */
  children: MatchResult<any>[] | MatchResult<any>;
}

interface MatchResult<T> {
  __match: typeof MATCH_SYMBOL;
  when: MaybeAccessor<T | undefined | null | false>;
  children: CReactNode | ((item: Accessor<NonNullable<T>>) => CReactNode);
}

/**
 * Match component - used inside Switch to define conditions
 *
 * For reactive conditions, pass an accessor function:
 * ```tsx
 * <Switch fallback={() => <Default />}>
 *   <Match when={() => status() === 'loading'}>
 *     <Loading />
 *   </Match>
 *   <Match when={() => status() === 'error'}>
 *     {() => <Error message={error()} />}
 *   </Match>
 *   <Match when={() => data()}>
 *     {(data) => <Content data={data()} />}
 *   </Match>
 * </Switch>
 * ```
 */
export function Match<T>(props: MatchProps<T>): MatchResult<T> {
  return {
    __match: MATCH_SYMBOL,
    when: props.when,
    children: props.children,
  };
}

/**
 * Switch component - evaluates Match children in order
 *
 * Renders the children of the first Match whose `when` is truthy.
 * If no Match is truthy, renders the fallback.
 *
 * For reactive conditions and fallbacks, pass accessor functions.
 */
export function Switch(props: SwitchProps): JSXElement {
  // Flatten children to array
  const matches = Array.isArray(props.children)
    ? props.children
    : props.children
      ? [props.children]
      : [];

  return createMemo(() => {
    for (const match of matches) {
      // Check if this is a Match component result
      if (
        match &&
        typeof match === "object" &&
        "__match" in match &&
        match.__match === MATCH_SYMBOL
      ) {
        const matchResult = match as unknown as MatchResult<unknown>;
        // Unwrap the when value (supports accessor functions)
        const value = access(matchResult.when);

        if (value) {
          // This match is truthy - render its children
          const { children } = matchResult;

          if (
            typeof children === "function" &&
            (children as Function).length > 0
          ) {
            // Children is a render function - pass accessor that accesss
            const accessor = () =>
              access(matchResult.when) as NonNullable<unknown>;
            return untrack(() => (children as Function)(accessor));
          }

          return children;
        }
      }
    }

    // No match found - render fallback (access in case it's an accessor)
    return access(props.fallback);
  }) as unknown as JSXElement;
}
