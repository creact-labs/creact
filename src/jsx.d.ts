
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
 * This tells TypeScript that when checking JSX element props:
 * 1. Take the component's declared props (P)
 * 2. Make key optional (it's in IntrinsicAttributes but shouldn't be required)
 * 3. Allow key to be passed even if not in component props
 *
 * We use Omit to remove 'key' from P if it exists, then add it back as optional
 */
declare global {
  namespace JSX {
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

export {};
