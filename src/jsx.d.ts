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
     * Allows any component to accept a key prop
     */
    interface ElementAttributesProperty {
      props: {};
    }
    
    /**
     * Base attributes available on all elements
     */
    interface IntrinsicAttributes {
      key?: string | number;
    }
  }
  
}

/**
 * Type helper for component props with children
 */
export interface PropsWithChildren<P = {}> {
  children?: JSX.Element | JSX.Element[];
}

/**
 * Type helper for functional components
 */
export type FC<P = {}> = (props: P & PropsWithChildren<P>) => JSX.Element | null;

export {};
