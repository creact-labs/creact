/**
 * JSX Runtime - createElement and Fragment
 */
export interface JSXElement {
    type: any;
    props: Record<string, any>;
    key?: string | number;
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
