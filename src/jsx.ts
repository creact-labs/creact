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
