// REQ-01: Renderer - JSX → Fiber transformation

import { FiberNode, JSXElement } from './types';
import { setRenderContext, clearRenderContext, resetConstructCounts } from '../hooks/useInstance';
import { setStateRenderContext, clearStateRenderContext } from '../hooks/useState';
import { setContextRenderContext, clearContextRenderContext, pushContextValue, popContextValue } from '../hooks/useContext';
import { getNodeName } from '../utils/naming';

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
    const nodeName = getNodeName(type, safeProps, key);
    const path = [...parentPath, nodeName];
    
    // Create Fiber node for component execution
    const fiber: FiberNode = {
      type,
      props: { ...safeProps },
      children: [],
      path,
      key,
      cloudDOMNodes: [], // Will be populated by useInstance
    };
    
    // Check if this is a Context Provider and push value onto stack
    const isProvider = typeof type === 'function' && (type as any)._isContextProvider;
    if (isProvider) {
      const contextId = (type as any)._contextId;
      pushContextValue(contextId, safeProps.value);
    }
    
    // Set context and execute component function to get children
    setRenderContext(fiber, path);
    setStateRenderContext(fiber);
    setContextRenderContext(fiber);
    resetConstructCounts(fiber); // Reset construct call counts for this component
    const children = this.executeComponent(type, safeProps, path);
    clearRenderContext();
    clearStateRenderContext();
    clearContextRenderContext();
    
    // Recursively render children
    if (children) {
      fiber.children = this.renderChildren(children, path);
    }
    
    // Pop context value from stack after rendering children
    if (isProvider) {
      const contextId = (type as any)._contextId;
      popContextValue(contextId);
    }
    
    return fiber;
  }
  
  /**
   * Execute a component function to resolve its children
   * 
   * Note: setRenderContext should already be called by renderComponent before this
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
      // Handle Fragment (symbol type)
      if (typeof type === 'symbol') {
        // Fragments just pass through their children
        return props.children;
      }
      
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
      
      throw new Error(`Unknown component type: ${String(type)}`);
    } finally {
      // Clear rendering context for hooks
      clearRenderContext();
      clearStateRenderContext();
      clearContextRenderContext();
      
      // Restore previous path
      this.currentPath = previousPath;
      
      // Copy CloudDOM nodes from temp fiber to actual fiber (will be done in renderElement)
      // This is handled by returning the tempFiber's cloudDOMNodes
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
   * Get current path (for hooks to access)
   */
  getCurrentPath(): string[] {
    return [...this.currentPath];
  }
}
