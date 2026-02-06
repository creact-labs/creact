/**
 * Children helper for resolving JSX children
 *
 * Provides a reactive accessor to resolved children, flattening
 * arrays and calling functions as needed.
 */

import type { JSXElement } from "../jsx/jsx-runtime";
import { type Accessor, createMemo } from "../reactive/signal";

/** Single resolved child element */
export type ResolvedJSXElement = Exclude<JSXElement, Function>;

/** Resolved children - arrays flattened, functions called */
export type ResolvedChildren = ResolvedJSXElement | ResolvedJSXElement[];

/** Return type of children() helper with toArray method */
export type ChildrenReturn = Accessor<ResolvedChildren> & {
  toArray: () => ResolvedJSXElement[];
};

/**
 * Create a memo that resolves children to a stable value
 *
 * Useful when you need to work with children as values, not just
 * pass them through. Resolves lazy children and flattens arrays.
 *
 * @example
 * ```tsx
 * function Stack(props) {
 *   const resolved = children(() => props.children);
 *
 *   // Can now work with children as values
 *   createEffect(() => {
 *     const kids = resolved();
 *     console.log('Number of resources:', Array.isArray(kids) ? kids.length : 1);
 *   });
 *
 *   return <Container>{resolved()}</Container>;
 * }
 * ```
 */
export function children(fn: Accessor<JSXElement>): ChildrenReturn {
  const c = createMemo(fn);
  const memo = createMemo(() => resolveChildren(c() as JSXElement));
  (memo as ChildrenReturn).toArray = () => {
    const result = memo();
    return Array.isArray(result) ? result : result != null ? [result] : [];
  };
  return memo as ChildrenReturn;
}

/**
 * Recursively resolve children to their final form
 */
function resolveChildren(children: JSXElement): ResolvedChildren {
  // Call zero-arg functions recursively
  if (typeof children === "function" && !(children as Function).length) {
    return resolveChildren((children as () => JSXElement)());
  }

  // Flatten arrays
  if (Array.isArray(children)) {
    const results: ResolvedJSXElement[] = [];
    for (let i = 0; i < children.length; i++) {
      const result = resolveChildren(children[i]);
      Array.isArray(result)
        ? results.push.apply(results, result)
        : results.push(result);
    }
    return results;
  }

  // Primitives and objects pass through (including null/undefined)
  return children as ResolvedChildren;
}
