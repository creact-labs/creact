// REQ-01: Core types for CReact rendering pipeline

/**
 * Fiber Node - Intermediate representation of JSX tree
 * Contains all components (containers + resources) before filtering to CloudDOM
 */
export interface FiberNode {
  /** Component type (function or class) */
  type: any;
  
  /** Props passed to the component */
  props: Record<string, any>;
  
  /** Child Fiber nodes */
  children: FiberNode[];
  
  /** Hierarchical path from root (e.g., ['registry', 'service']) */
  path: string[];
  
  /** CloudDOM node attached by useInstance (if any) */
  cloudDOMNode?: CloudDOMNode;
  
  /** State attached by useState (if any) */
  state?: Record<string, any>;
  
  /** Key for stable identity (optional) */
  key?: string;
}

/**
 * CloudDOM Node - Represents actual cloud resources
 * Only includes components that called useInstance
 */
export interface CloudDOMNode {
  /** Unique resource ID (e.g., 'registry.service') */
  id: string;
  
  /** Hierarchical path (e.g., ['registry', 'service']) */
  path: string[];
  
  /** Construct type (e.g., EcrRepository, AppRunnerService) */
  construct: any;
  
  /** Props for the construct */
  props: Record<string, any>;
  
  /** Child CloudDOM nodes */
  children: CloudDOMNode[];
  
  /** Outputs from useState (optional) */
  outputs?: Record<string, any>;
}

/**
 * JSX Element type
 */
export interface JSXElement {
  type: any;
  props: any;
  key?: string;
}
