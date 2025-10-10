/**
 * JSX type definitions for CReact
 *
 * This file provides TypeScript with the type information needed
 * to validate JSX syntax and component props.
 */

import { JSXElement } from './jsx';

declare global {
  namespace JSX {
    /**
     * The type returned by JSX expressions
     */
    interface Element extends JSXElement {}

    /**
     * Intrinsic elements (HTML-like elements)
     * Empty for CReact - we only support component elements
     */
    interface IntrinsicElements {
      // CReact doesn't support HTML elements, only components
    }

    /**
     * Defines which prop contains children
     * This allows TypeScript to understand the children prop
     */
    interface ElementChildrenAttribute {
      children: {};
    }

    /**
     * Base attributes available on all elements (including key)
     * This applies to all JSX elements, both intrinsic and component-based
     *
     * IMPORTANT: This makes 'key' available on ALL JSX elements,
     * including function components, without needing to add it to props
     */
    interface IntrinsicAttributes {
      key?: string | number;
    }

    /**
     * Attributes available on class components
     */
    interface IntrinsicClassAttributes<T> {
      key?: string | number;
    }

    /**
     * Tell TypeScript how to extract props from a component type
     * This is critical for making LibraryManagedAttributes work
     */
    interface ElementAttributesProperty {
      props: {};
    }
  }
}

/**
 * Augment the global LibraryManagedAttributes to properly handle key prop
 * 
 * TypeScript calls this with:
 * - C: the component type (function)
 * - P: the ALREADY EXTRACTED props type from the component
 * 
 * So we work with P directly, not by extracting from C again.
 * We simply merge P with IntrinsicAttributes to allow key/ref props.
 */
declare global {
  namespace JSX {
    type LibraryManagedAttributes<C, P> =
      // P is already the props type, just add IntrinsicAttributes to it
      P & IntrinsicAttributes;
  }
}

/**
 * Type helper for component props with children
 */
export interface PropsWithChildren {
  children?: JSX.Element | JSX.Element[];
}

/**
 * Type helper for functional components
 * Note: key is handled by JSX.IntrinsicAttributes and doesn't need to be in props
 */
export type FC<P = Record<string, unknown>> = (props: P & PropsWithChildren) => JSX.Element | null;

/**
 * Type helper for component props that includes JSX attributes (like key)
 * Use this when defining component prop types to allow key prop
 */
export type ComponentProps<P = Record<string, unknown>> = P & JSX.IntrinsicAttributes;

export {};
