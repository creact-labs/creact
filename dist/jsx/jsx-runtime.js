/**
 * JSX Runtime - createElement and Fragment
 */
/**
 * Create a JSX element
 */
export function createElement(type, props, ...children) {
    const normalizedProps = { ...props };
    // Handle children
    if (children.length === 1) {
        normalizedProps.children = children[0];
    }
    else if (children.length > 1) {
        normalizedProps.children = children;
    }
    // Extract key
    const key = normalizedProps.key;
    delete normalizedProps.key;
    return {
        type,
        props: normalizedProps,
        key,
    };
}
/**
 * Fragment - renders children without wrapper
 */
export const Fragment = Symbol.for('creact.fragment');
/**
 * JSX runtime functions (for automatic JSX transform)
 */
export function jsx(type, props, key) {
    return { type, props, key };
}
export function jsxs(type, props, key) {
    return { type, props, key };
}
export { jsx as jsxDEV };
