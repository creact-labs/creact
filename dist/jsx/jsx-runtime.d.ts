/**
 * JSX Runtime - createElement and Fragment
 */
export interface JSXElement {
    type: any;
    props: Record<string, any>;
    key?: string | number;
}
/**
 * JSX namespace for TypeScript
 * Handles key and children automatically - no need to declare in component props
 */
export declare namespace JSX {
    type Element = JSXElement;
    interface IntrinsicElements {
        [elemName: string]: any;
    }
    interface IntrinsicAttributes {
        key?: string | number;
    }
    interface ElementChildrenAttribute {
        children: {};
    }
}
/**
 * Create a JSX element
 */
export declare function createElement(type: any, props: Record<string, any> | null, ...children: any[]): JSXElement;
/**
 * Fragment - renders children without wrapper
 */
export declare const Fragment: unique symbol;
/**
 * JSX runtime functions (for automatic JSX transform)
 */
export declare function jsx(type: any, props: Record<string, any>, key?: string | number): JSXElement;
export declare function jsxs(type: any, props: Record<string, any>, key?: string | number): JSXElement;
export { jsx as jsxDEV };
