// REQ-01: Renderer - JSX → Fiber transformation

import { FiberNode, JSXElement } from './types';

/**
 * Renderer transforms JSX into a Fiber tree
 * 
 * The Fiber tree is an intermediate representation that includes:
 * - All components (containers + resources)
 * - Hierarchical paths for identity tracking
 * - Props and children resolved recursively
 * 
 * No dependencies injected - pure transformation logic
 */
export class Renderer {
  private currentFiber: FiberNode | null = null;
  private currentPath: string[] = [];
  
  /**
   * Render JSX to Fiber tree
   * 
   * @param jsx - JSX element to render
   * @returns Root Fiber node
   */
  render(jsx: JSXElement): FiberNode {
    this.currentPath = [];
    this.currentFiber = this.renderElement(jsx, []);
    
    // Optional debug trace for development introspection
    if (process.env.NODE_ENV === 'development') {
      const typeName = typeof jsx.type === 'function' 
        ? (jsx.type.displayName || jsx.type.name || 'Anonymous')
        : jsx.type;
      console.debug('[Renderer] Rendering:', typeName);
    }
    
    // Enhanced debug tracing for Validator integration
    if (process.env.CREACT_DEBUG === 'true') {
      console.log('[Renderer] Fiber tree:', JSON.stringify(this.currentFiber, null, 2));
    }
    
    return this.currentFiber;
  }
  
  /**
   * Get the current Fiber tree (for validation)
   */
  getCurrentFiber(): FiberNode | null {
    return this.currentFiber;
  }
  
  /**
   * Recursively render a JSX element to a Fiber node
   * 
   * @param element - JSX element
   * @param parentPath - Path from parent
   * @returns Fiber node
   */
  private renderElement(element: JSXElement, parentPath: string[]): FiberNode {
    if (!element || typeof element !== 'object') {
      throw new Error('Invalid JSX element');
    }
    
    const { type, props, key } = element;
    
    if (!type) {
      throw new Error('JSX element missing type');
    }
    
    // Ensure props is always an object (handle null/undefined)
    const safeProps = props || {};
    
    // Generate path for this node
    const nodeName = this.getNodeName(type, safeProps, key);
    const path = [...parentPath, nodeName];
    
    // Create Fiber node
    const fiber: FiberNode = {
      type,
      props: { ...safeProps },
      children: [],
      path,
      key,
    };
    
    // Execute component function to get children
    const children = this.executeComponent(type, safeProps, path);
    
    // Recursively render children
    if (children) {
      fiber.children = this.renderChildren(children, path);
    }
    
    return fiber;
  }
  
  /**
   * Execute a component function to resolve its children
   * 
   * @param type - Component type (function or class)
   * @param props - Props to pass
   * @param path - Current path (for context)
   * @returns Children elements
   */
  private executeComponent(type: any, props: Record<string, any>, path: string[]): any {
    // Store current path for hooks to access
    const previousPath = this.currentPath;
    this.currentPath = path;
    
    try {
      // Handle function components
      if (typeof type === 'function') {
        // Check if it's a class component
        if (type.prototype && type.prototype.isReactComponent) {
          const instance = new type(props);
          return instance.render();
        }
        
        // Function component
        return type(props);
      }
      
      // Handle intrinsic elements (strings like 'div')
      if (typeof type === 'string') {
        return props.children;
      }
      
      throw new Error(`Unknown component type: ${type}`);
    } finally {
      // Restore previous path
      this.currentPath = previousPath;
    }
  }
  
  /**
   * Render children elements
   * 
   * @param children - Children to render (can be array, single element, or null)
   * @param parentPath - Path from parent
   * @returns Array of Fiber nodes
   */
  private renderChildren(children: any, parentPath: string[]): FiberNode[] {
    if (!children) {
      return [];
    }
    
    // Normalize to array
    const childArray = Array.isArray(children) ? children : [children];
    
    // Filter out null/undefined/boolean values
    const validChildren = childArray.filter(
      (child) => child !== null && child !== undefined && typeof child !== 'boolean'
    );
    
    // Render each child
    return validChildren.map((child) => {
      // Handle text nodes (strings/numbers)
      if (typeof child === 'string' || typeof child === 'number') {
        // Skip text nodes in infrastructure (they don't make sense)
        return null;
      }
      
      // Render JSX element
      if (typeof child === 'object' && child.type) {
        return this.renderElement(child, parentPath);
      }
      
      return null;
    }).filter((node): node is FiberNode => node !== null);
  }
  
  /**
   * Generate a node name from component type and props
   * 
   * Priority:
   * 1. key prop (if provided)
   * 2. name prop (if provided)
   * 3. Component function name (converted to kebab-case)
   * 
   * @param type - Component type
   * @param props - Component props
   * @param key - Key prop
   * @returns Node name
   */
  private getNodeName(type: any, props: Record<string, any>, key?: string): string {
    // Use key if provided
    if (key) {
      return this.toKebabCase(key);
    }
    
    // Use name prop if provided
    if (props.name) {
      return this.toKebabCase(props.name);
    }
    
    // Use component function name or displayName
    if (typeof type === 'function') {
      const name = type.displayName || type.name || 'anonymous';
      return this.toKebabCase(name);
    }
    
    // Use string type as-is
    if (typeof type === 'string') {
      return this.toKebabCase(type);
    }
    
    return 'unknown';
  }
  
  /**
   * Convert string to kebab-case
   * 
   * Examples:
   * - 'RegistryStack' → 'registry-stack'
   * - 'ServiceAPI' → 'service-api'
   * - 'my-service' → 'my-service'
   * 
   * @param str - String to convert
   * @returns Kebab-case string
   */
  private toKebabCase(str: string): string {
    return str
      // Insert hyphen before uppercase letters
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      // Convert to lowercase
      .toLowerCase()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove multiple consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, '');
  }
  
  /**
   * Get current path (for hooks to access)
   */
  getCurrentPath(): string[] {
    return [...this.currentPath];
  }
}
