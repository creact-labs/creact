
/**

 * Licensed under the Apache License, Version 2.0 (the "License");

 * you may not use this file except in compliance with the License.

 * You may obtain a copy of the License at

 *

 *     http://www.apache.org/licenses/LICENSE-2.0

 *

 * Unless required by applicable law or agreed to in writing, software

 * distributed under the License is distributed on an "AS IS" BASIS,

 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

 * See the License for the specific language governing permissions and

 * limitations under the License.

 *

 * Copyright 2025 Daniel Coutinho Ribeiro

 */

/**
 * JSX factory for CReact
 *
 * This module provides the createElement factory function that TypeScript
 * uses to transform JSX syntax into function calls.
 *
 * Example transformation:
 *   <Component prop="value" />
 *   → CReact.createElement(Component, { prop: "value" })
 */

export interface JSXElement {
  type: any;
  props: Record<string, any>;
  key?: string | number;
}

export namespace CReact {
  /**
   * JSX factory function called by TypeScript when transforming JSX
   *
   * @param type - Component function or string (for intrinsic elements)
   * @param props - Props object (may include key and children)
   * @param children - Child elements (variadic)
   * @returns JSXElement object with normalized props
   */
  export function createElement(
    type: any,
    props: Record<string, any> | null,
    ...children: any[]
  ): JSXElement {
    // Normalize props (handle null case)
    const normalizedProps: Record<string, any> = props ? { ...props } : {};

    // Extract key from props if present
    const key = normalizedProps.key;
    delete normalizedProps.key;

    // Handle children normalization
    if (children.length > 0) {
      // Flatten children array and filter out null/undefined
      const flattenedChildren = children.flat().filter((child) => child != null);

      // Single child: store as-is
      // Multiple children: store as array
      if (flattenedChildren.length === 1) {
        normalizedProps.children = flattenedChildren[0];
      } else if (flattenedChildren.length > 1) {
        normalizedProps.children = flattenedChildren;
      }
    }

    return {
      type,
      props: normalizedProps,
      key,
    };
  }

  /**
   * Fragment symbol for <>...</> syntax
   * Fragments allow grouping multiple children without adding extra nodes
   *
   * Note: Fragment is a Symbol at runtime, but typed as a function for JSX compatibility
   */
  export const Fragment = Symbol.for('CReact.Fragment') as any as (props: {
    children?: any;
  }) => JSXElement;
}

/**
 * Global JSX namespace declarations
 *
 * These declarations tell TypeScript how to validate JSX syntax and component props.
 * By including them in this file (not a separate .d.ts), they are automatically
 * included in the compiled output and available to package consumers.
 */
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

    /**
     * Augment LibraryManagedAttributes to properly handle key prop
     *
     * This tells TypeScript that when checking JSX element props:
     * 1. Take the component's declared props (P)
     * 2. Make key optional (it's in IntrinsicAttributes but shouldn't be required)
     * 3. Allow key to be passed even if not in component props
     *
     * We use Omit to remove 'key' from P if it exists, then add it back as optional
     */
    type LibraryManagedAttributes<C, P> =
      // Remove key from P if it exists, then add IntrinsicAttributes (which includes optional key)
      Omit<P, 'key'> & IntrinsicAttributes;
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
