/**
 * JSX Type Definitions
 */

export namespace JSX {
  export type Element = import('./jsx-runtime.js').JSXElement;

  export interface IntrinsicElements {
    [key: string]: any;
  }

  export interface ElementChildrenAttribute {
    children: {};
  }
}
