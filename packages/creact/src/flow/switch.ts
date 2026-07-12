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

import type { CReactNode, JSXElement } from "../jsx/jsx-runtime";
import {
  type Accessor,
  access,
  createMemo,
  type MaybeAccessor,
} from "../reactive/signal";
import { untrack } from "../reactive/tracking";

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
  // MatchResult<any>: each Match narrows a different T, and MatchResult is
  // invariant in T (children callback), so no common non-any type exists
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

  return createMemo(() =>
    selectMatch(matches, props.fallback),
  ) as unknown as JSXElement;
}

/** Render the first truthy match, or the fallback when none matches */
function selectMatch(
  matches: unknown[],
  fallback: SwitchProps["fallback"],
): CReactNode {
  for (const match of matches) {
    if (isMatchResult(match) && access(match.when)) {
      return renderMatch(match);
    }
  }

  // No match found - render fallback (access in case it's an accessor)
  return access(fallback);
}

/** Is this child the result of a <Match> component? */
function isMatchResult(match: unknown): match is MatchResult<unknown> {
  return (
    match !== null &&
    typeof match === "object" &&
    "__match" in match &&
    (match as MatchResult<unknown>).__match === MATCH_SYMBOL
  );
}

/** Render a truthy match's children, supporting render-function children */
function renderMatch(match: MatchResult<unknown>) {
  const { children } = match;

  if (typeof children === "function") {
    if (children.length > 0) {
      // Children is a render function — pass an accessor over the when value
      const accessor = () => access(match.when) as NonNullable<unknown>;
      return untrack(() => children(accessor));
    }
    // Zero-arg children are accessors (CReactNode includes () => CReactNode)
    // — evaluate them exactly like reactive fallbacks
    return access(children as MaybeAccessor<CReactNode>);
  }

  return children;
}
