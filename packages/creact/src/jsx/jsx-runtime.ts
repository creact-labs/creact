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
  | JSXElement[]
  | (() => CReactNode)
  | null
  | undefined;

/**
 * JSX namespace for TypeScript
 * Handles key and children automatically - no need to declare in component props
 */
export namespace JSX {
  export type Element = JSXElement;

  // CReact has no host elements (no DOM), so this stays empty and any
  // lowercase JSX tag is a compile-time error by design.
  export interface IntrinsicElements {}

  // key is handled automatically by JSX, not passed to component
  export interface IntrinsicAttributes {
    key?: string | number;
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
