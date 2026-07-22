/**
 * JSX Runtime - createElement and Fragment
 */

export interface JSXElement {
  type: unknown;
  // Values stay `any` deliberately: props carry arbitrary user data, and
  // interface-typed props objects (spread via <Comp {...props} />) are only
  // assignable to an any-valued record — Record<string, unknown> rejects
  // interfaces without index signatures. Same reason React types element
  // props as any.
  props: Record<string, any>;
  key?: string | number;
}

/**
 * CReactNode - represents any valid child in CReact
 *
 * Includes accessor functions (memos, signals) which the runtime
 * resolves reactively.
 */
export type CReactNode =
  | JSXElement
  | CReactNode[]
  | (() => CReactNode)
  | string
  | number
  | boolean
  | null
  | undefined;

/**
 * JSX namespace for TypeScript
 * Handles key and children automatically - no need to declare in component props
 */
export namespace JSX {
  // A component may return a single element, several elements (a fragment or a
  // bare array), a reactive accessor, or nothing — the runtime resolves each.
  // This mirrors Solid: the return contract is wider than a lone element.
  export type Element = CReactNode;

  // CReact has no host elements (no DOM), so this stays empty and any
  // lowercase JSX tag is a compile-time error by design.
  export interface IntrinsicElements {}

  // key is handled automatically by JSX, not passed to the component. testId is
  // a universal attribute for tests (queryable via @creact-labs/testing) — any
  // component accepts it without declaring it, and it flows through to the node.
  export interface IntrinsicAttributes {
    key?: string | number;
    testId?: string;
  }

  // children is handled automatically by JSX
  export interface ElementChildrenAttribute {
    children: {};
  }
}

/**
 * Create a JSX element
 */
export function createElement(
  type: unknown,
  props: Record<string, any> | null,
  ...children: unknown[]
): JSXElement {
  const normalizedProps: Record<string, any> = { ...props };

  // Handle children
  if (children.length === 1) {
    normalizedProps.children = children[0];
  } else if (children.length > 1) {
    normalizedProps.children = children;
  }

  return {
    type,
    props: normalizedProps,
  };
}

/**
 * Fragment - renders children without wrapper
 */
export const Fragment = Symbol.for("creact.fragment");

/**
 * JSX runtime functions (for automatic JSX transform)
 */
export function jsx(
  type: unknown,
  props: Record<string, any>,
  key?: string | number,
): JSXElement {
  return { type, props, key };
}

export function jsxs(
  type: unknown,
  props: Record<string, any>,
  key?: string | number,
): JSXElement {
  return { type, props, key };
}

export { jsx as jsxDEV };
