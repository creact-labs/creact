/**
 * JSX Type Definitions
 */

export namespace JSX {
  export type Element = import("./jsx-runtime").JSXElement;

  export interface IntrinsicElements {
    [key: string]: any;
  }

  export interface ElementChildrenAttribute {
    children: {};
  }
}
