// REQ-01: Renderer - JSX → Fiber transformation

import { FiberNode, JSXElement, ReRenderReason } from './types';
import { setRenderContext, clearRenderContext, resetConstructCounts } from '../hooks/useInstance';
import { setStateRenderContext, clearStateRenderContext } from '../hooks/useState';
import {
  setContextRenderContext,
  clearContextRenderContext,
  pushContextValue,
  popContextValue,
  clearContextStacks,
} from '../hooks/useContext';
import { runWithHookContext } from '../hooks/context';
import { getNodeName } from '../utils/naming';
import { RenderScheduler } from './RenderScheduler';
import { ContextDependencyTracker } from './ContextDependencyTracker';

/**
 * Renderer transforms JSX into a Fiber tree
 *
 * The Fiber tree is an intermediate representation that includes:
 * - All components (containers + resources)
 * - Hierarchical paths for identity tracking
 * - Props and children resolved recursively
 *
 * Enhanced with context reactivity:
 * - Tracks context provider value changes
 * - Integrates with ContextDependencyTracker for selective re-rendering
 * - Detects when context values change and triggers appropriate re-renders
 *
 * No dependencies injected - pure transformation logic
 */
export class Renderer {
  private currentFiber: FiberNode | null = null;
  private currentPath: string[] = [];
  private renderScheduler?: RenderScheduler;
  private contextDependencyTracker?: any;
  
  // Structural change detection
  private previousStructures = new WeakMap<FiberNode, string>();



  /**
   * Render JSX to Fiber tree
   *
   * @param jsx - JSX element to render
   * @returns Root Fiber node
   */
  render(jsx: JSXElement): FiberNode {
    // Run rendering within AsyncLocalStorage context for thread safety
    return runWithHookContext(() => {
      try {
        this.currentPath = [];
        this.currentFiber = this.renderElement(jsx, []);
        return this.currentFiber;
      } finally {
        // Clear context stacks to prevent memory leaks
        // This ensures context stacks are always cleared after each render cycle
        clearContextStacks();
      }
    });
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
      key: key?.toString(),
      cloudDOMNodes: [], // Will be populated by useInstance
    };

    // Check if this is a Context Provider and handle value changes
    const isProvider = typeof type === 'function' && (type as any)._isContextProvider;
    if (isProvider) {
      const contextId = (type as any)._contextId;
      const newValue = safeProps.value;

      // Detect context value changes and schedule re-renders if needed
      this.handleContextProviderValueChange(contextId, newValue);

      // Push value onto stack for child components
      pushContextValue(contextId, newValue);
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

    // Check for structural changes after component execution
    this.handleStructuralChanges(fiber);

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
    return validChildren
      .map((child) => {
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
      })
      .filter((node): node is FiberNode => node !== null);
  }

  /**
   * Get current path (for hooks to access)
   */
  getCurrentPath(): string[] {
    return [...this.currentPath];
  }

  /**
   * Get current Fiber for post-deployment effects
   *
   * @returns Current Fiber node or null
   */
  getCurrentFiber(): FiberNode | null {
    return this.currentFiber;
  }

  /**
   * Set the RenderScheduler for selective re-rendering integration
   * 
   * @param scheduler - RenderScheduler instance
   */
  setRenderScheduler(scheduler: RenderScheduler): void {
    this.renderScheduler = scheduler;
  }

  /**
   * Set the ContextDependencyTracker for context reactivity
   * 
   * @param tracker - ContextDependencyTracker instance
   */
  setContextDependencyTracker(tracker: any): void {
    this.contextDependencyTracker = tracker;
  }

  /**
   * Handle context provider value changes
   * Called when a context provider's value prop changes
   * 
   * @param contextId - Context identifier
   * @param newValue - New context value
   */
  private handleContextProviderValueChange(contextId: symbol, newValue: any): void {
    if (this.contextDependencyTracker) {
      try {
        // Update context value and get affected fibers
        const affectedFibers = this.contextDependencyTracker.updateContextValue(contextId, newValue);

        // Schedule re-renders for affected components
        if (this.renderScheduler && affectedFibers.length > 0) {
          affectedFibers.forEach((fiber: FiberNode) => {
            this.renderScheduler!.schedule(fiber, 'context-change');
          });
        }
      } catch (error) {
        console.warn('[Renderer] Context provider value change handling failed:', error);
      }
    }
  }

  /**
   * Detect structural changes in a component
   * Compares the current structure with the previous render
   * 
   * @param fiber - Fiber node to check for structural changes
   * @returns True if structural changes were detected
   */
  private detectStructuralChanges(fiber: FiberNode): boolean {
    // Generate structural signature for current render
    const currentStructure = this.generateStructuralSignature(fiber);
    
    // Get previous structure
    const previousStructure = this.previousStructures.get(fiber);
    
    // Store current structure for next comparison
    this.previousStructures.set(fiber, currentStructure);
    
    // If no previous structure, this is the first render (not a change)
    if (!previousStructure) {
      return false;
    }
    
    // Compare structures
    const hasChanged = previousStructure !== currentStructure;
    
    if (hasChanged && process.env.CREACT_DEBUG === 'true') {
      console.debug(`[Renderer] Structural change detected in ${fiber.path.join('.')}:`);
      console.debug(`  Previous: ${previousStructure}`);
      console.debug(`  Current:  ${currentStructure}`);
    }
    
    return hasChanged;
  }

  /**
   * Generate a structural signature for a fiber node
   * This captures the essential structure that affects CloudDOM generation
   * 
   * @param fiber - Fiber node to generate signature for
   * @returns Structural signature string
   */
  private generateStructuralSignature(fiber: FiberNode): string {
    const parts: string[] = [];
    
    // Include component type
    parts.push(`type:${fiber.type?.name || fiber.type}`);
    
    // Include number and types of CloudDOM nodes (useInstance calls)
    if (fiber.cloudDOMNodes && fiber.cloudDOMNodes.length > 0) {
      const nodeSignatures = fiber.cloudDOMNodes.map(node => 
        `${node.construct?.name || 'unknown'}:${node.id}`
      ).sort(); // Sort for consistent ordering
      parts.push(`nodes:[${nodeSignatures.join(',')}]`);
    } else {
      parts.push('nodes:[]');
    }
    
    // Include number of children and their types
    if (fiber.children && fiber.children.length > 0) {
      const childTypes = fiber.children.map(child => 
        child.type?.name || child.type || 'unknown'
      ).sort(); // Sort for consistent ordering
      parts.push(`children:[${childTypes.join(',')}]`);
    } else {
      parts.push('children:[]');
    }
    
    // Include key if present (affects identity)
    if (fiber.key) {
      parts.push(`key:${fiber.key}`);
    }
    
    return parts.join('|');
  }

  /**
   * Check for structural changes and schedule re-renders if needed
   * Called during component re-execution
   * 
   * @param fiber - Fiber node to check
   */
  private handleStructuralChanges(fiber: FiberNode): void {
    if (this.detectStructuralChanges(fiber)) {
      // Schedule re-render for structural change
      if (this.renderScheduler) {
        this.renderScheduler.schedule(fiber, 'structural-change');
      }
      
      // Also check if any dependent components need re-rendering
      if (fiber.dependents) {
        Array.from(fiber.dependents).forEach(dependent => {
          if (this.renderScheduler) {
            this.renderScheduler.schedule(dependent, 'structural-change');
          }
        });
      }
    }
  }

  /**
   * Re-render specific components with selective updates
   * This method re-executes only the specified components and their children
   * 
   * @param components - Array of fiber nodes to re-render
   * @param reason - Reason for the re-render
   * @returns Updated root fiber node
   */
  reRenderComponents(components: FiberNode[], reason: ReRenderReason): FiberNode {
    if (components.length === 0) {
      throw new Error('[Renderer] No components provided for re-rendering');
    }

    return runWithHookContext(() => {
      try {
        // Find the root component to determine the full tree structure
        const rootComponent = this.findRootComponent(components);

        if (!rootComponent) {
          throw new Error('[Renderer] Could not determine root component for re-rendering');
        }

        // Track dependencies during re-render
        this.trackDependenciesDuringRender(components);

        // Selectively re-render the components
        const updatedRoot = this.selectiveReRender(rootComponent, new Set(components), reason);

        // Update current fiber reference
        this.currentFiber = updatedRoot;

        return updatedRoot;

      } finally {
        // Clear context stacks to prevent memory leaks
        clearContextStacks();
      }
    });
  }

  /**
   * Find components that depend on changed state/outputs
   * This method traverses the fiber tree to find dependent components
   * 
   * @param changedFiber - Fiber node that changed
   * @returns Set of fiber nodes that depend on the changed fiber
   */
  findDependentComponents(changedFiber: FiberNode): Set<FiberNode> {
    const dependents = new Set<FiberNode>();

    // If the fiber has explicit dependents, add them
    if (changedFiber.dependents) {
      Array.from(changedFiber.dependents).forEach(dependent => dependents.add(dependent));
    }

    // Traverse the tree to find implicit dependencies
    if (this.currentFiber) {
      this.findDependentsRecursive(this.currentFiber, changedFiber, dependents);
    }

    return dependents;
  }

  /**
   * Track component dependencies during render
   * This builds the dependency graph for selective re-rendering
   * 
   * @param components - Components being rendered
   */
  private trackDependenciesDuringRender(components: FiberNode[]): void {
    for (const component of components) {
      // Initialize dependency tracking if not present
      if (!component.dependencies) {
        component.dependencies = new Set();
      }
      if (!component.dependents) {
        component.dependents = new Set();
      }

      // Track dependencies based on context usage, state bindings, etc.
      this.buildDependencyGraph(component);
    }
  }

  /**
   * Build dependency graph for a component
   * This analyzes the component's usage patterns to determine dependencies
   * 
   * @param component - Component to analyze
   */
  private buildDependencyGraph(component: FiberNode): void {
    // Track context dependencies
    const contextDependencies = this.contextDependencyTracker.getFiberContexts(component);
    contextDependencies.forEach((contextId: symbol) => {
      // Find context provider components and add as dependencies
      const providerFiber = this.findContextProvider(contextId);
      if (providerFiber && providerFiber !== component) {
        if (!component.dependencies) {
          component.dependencies = new Set();
        }
        component.dependencies.add(providerFiber);

        if (!providerFiber.dependents) {
          providerFiber.dependents = new Set();
        }
        providerFiber.dependents.add(component);
      }
    });

    // Track state binding dependencies
    // (This would integrate with StateBindingManager)

    // Track instance output dependencies
    // (This would integrate with ProviderOutputTracker)

    // Basic parent-child dependencies
    if (component.children) {
      component.children.forEach(child => {
        // Child depends on parent
        if (!child.dependencies) {
          child.dependencies = new Set();
        }
        child.dependencies.add(component);

        // Parent has child as dependent
        if (!component.dependents) {
          component.dependents = new Set();
        }
        component.dependents.add(child);
      });
    }
  }

  /**
   * Find the context provider fiber for a given context ID
   * This traverses up the fiber tree to find the provider
   * 
   * @param contextId - Context identifier to find provider for
   * @returns Provider fiber node or null if not found
   */
  private findContextProvider(contextId: symbol): FiberNode | null {
    // This is a simplified implementation
    // In a full implementation, we would traverse the fiber tree
    // to find the actual provider component

    if (!this.currentFiber) {
      return null;
    }

    // For now, we'll do a simple search through the current fiber tree
    return this.searchForProvider(this.currentFiber, contextId);
  }

  /**
   * Recursively search for a context provider in the fiber tree
   * 
   * @param fiber - Current fiber to search
   * @param contextId - Context ID to find
   * @returns Provider fiber or null
   */
  private searchForProvider(fiber: FiberNode, contextId: symbol): FiberNode | null {
    // Check if this fiber is a provider for the context
    const isProvider = typeof fiber.type === 'function' &&
      (fiber.type as any)._isContextProvider &&
      (fiber.type as any)._contextId === contextId;

    if (isProvider) {
      return fiber;
    }

    // Search children
    if (fiber.children) {
      for (const child of fiber.children) {
        const result = this.searchForProvider(child, contextId);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  /**
   * Perform selective re-render of specific components
   * Only re-executes components that need updates
   * 
   * @param rootFiber - Root fiber node
   * @param componentsToReRender - Set of components that need re-rendering
   * @param reason - Reason for re-render
   * @returns Updated fiber tree
   */
  private selectiveReRender(
    rootFiber: FiberNode,
    componentsToReRender: Set<FiberNode>,
    reason: ReRenderReason
  ): FiberNode {
    // Create a copy of the root fiber for selective updates
    const updatedFiber = this.cloneFiberForUpdate(rootFiber);

    // Recursively update only the components that need re-rendering
    this.selectiveReRenderRecursive(updatedFiber, componentsToReRender, reason, []);

    return updatedFiber;
  }

  /**
   * Recursively perform selective re-rendering
   * 
   * @param fiber - Current fiber node
   * @param componentsToReRender - Set of components to re-render
   * @param reason - Reason for re-render
   * @param currentPath - Current path in the tree
   */
  private selectiveReRenderRecursive(
    fiber: FiberNode,
    componentsToReRender: Set<FiberNode>,
    reason: ReRenderReason,
    currentPath: string[]
  ): void {
    // Check if this component needs re-rendering
    const needsReRender = this.shouldReRenderComponent(fiber, componentsToReRender);

    if (needsReRender) {
      // Update reactive state
      if (!fiber.reactiveState) {
        fiber.reactiveState = {
          renderCount: 0,
          isDirty: false,
          updatePending: false
        };
      }

      fiber.reactiveState.lastRenderReason = reason;
      fiber.reactiveState.lastRenderTime = Date.now();
      fiber.reactiveState.renderCount++;
      fiber.reactiveState.isDirty = false;
      fiber.reactiveState.updatePending = false;

      // Re-execute the component
      this.reExecuteComponent(fiber, currentPath);
    }

    // Recursively process children
    if (fiber.children) {
      fiber.children.forEach(child => {
        const childPath = [...currentPath, child.path[child.path.length - 1]];
        this.selectiveReRenderRecursive(child, componentsToReRender, reason, childPath);
      });
    }
  }

  /**
   * Determine if a component should be re-rendered
   * 
   * @param fiber - Fiber node to check
   * @param componentsToReRender - Set of components marked for re-rendering
   * @returns True if component should be re-rendered
   */
  private shouldReRenderComponent(fiber: FiberNode, componentsToReRender: Set<FiberNode>): boolean {
    // Direct match
    if (componentsToReRender.has(fiber)) {
      return true;
    }

    // Check if any dependencies need re-rendering
    if (fiber.dependencies) {
      const dependencyArray = Array.from(fiber.dependencies);
      for (const dependency of dependencyArray) {
        if (componentsToReRender.has(dependency)) {
          return true;
        }
      }
    }

    // Check reactive state
    if (fiber.reactiveState?.isDirty) {
      return true;
    }

    return false;
  }

  /**
   * Re-execute a component function
   * 
   * @param fiber - Fiber node to re-execute
   * @param currentPath - Current path in the tree
   */
  private reExecuteComponent(fiber: FiberNode, currentPath: string[]): void {
    // Set up rendering context
    setRenderContext(fiber, fiber.path);
    setStateRenderContext(fiber);
    setContextRenderContext(fiber);
    resetConstructCounts(fiber);

    try {
      // Re-execute the component
      const children = this.executeComponent(fiber.type, fiber.props, fiber.path);

      // Update children if they changed
      if (children) {
        fiber.children = this.renderChildren(children, fiber.path);
      }

      // Check for structural changes after re-execution
      this.handleStructuralChanges(fiber);

    } finally {
      // Clean up context
      clearRenderContext();
      clearStateRenderContext();
      clearContextRenderContext();
    }
  }

  /**
   * Find the root component from a set of components
   * 
   * @param components - Array of components
   * @returns Root component or null
   */
  private findRootComponent(components: FiberNode[]): FiberNode | null {
    // Find the component with the shortest path (closest to root)
    let rootComponent: FiberNode | null = null;
    let shortestPathLength = Infinity;

    for (const component of components) {
      if (component.path.length < shortestPathLength) {
        shortestPathLength = component.path.length;
        rootComponent = component;
      }
    }

    return rootComponent;
  }

  /**
   * Recursively find dependent components
   * 
   * @param currentFiber - Current fiber being examined
   * @param changedFiber - Fiber that changed
   * @param dependents - Set to collect dependents
   */
  private findDependentsRecursive(
    currentFiber: FiberNode,
    changedFiber: FiberNode,
    dependents: Set<FiberNode>
  ): void {
    // Check if current fiber depends on changed fiber
    if (currentFiber.dependencies?.has(changedFiber)) {
      dependents.add(currentFiber);
    }

    // Recursively check children
    if (currentFiber.children) {
      currentFiber.children.forEach(child => {
        this.findDependentsRecursive(child, changedFiber, dependents);
      });
    }
  }







  /**
   * Set StateBindingManager for context dependency tracker integration
   */
  setStateBindingManager(stateBindingManager: any): void {
    this.contextDependencyTracker.setStateBindingManager(stateBindingManager);
  }

  /**
   * Clone a fiber node for selective updates
   * 
   * @param fiber - Fiber to clone
   * @returns Cloned fiber
   */
  private cloneFiberForUpdate(fiber: FiberNode): FiberNode {
    return {
      ...fiber,
      props: { ...fiber.props },
      children: fiber.children ? fiber.children.map(child => this.cloneFiberForUpdate(child)) : [],
      hooks: fiber.hooks ? [...fiber.hooks] : undefined,
      state: fiber.state ? { ...fiber.state } : undefined,
      reactiveState: fiber.reactiveState ? { ...fiber.reactiveState } : undefined,
      dependencies: fiber.dependencies ? new Set(fiber.dependencies) : undefined,
      dependents: fiber.dependents ? new Set(fiber.dependents) : undefined
    };
  }
}
