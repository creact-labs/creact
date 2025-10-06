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

  /** CloudDOM nodes attached by useInstance calls (if any) - array form */
  cloudDOMNodes?: CloudDOMNode[];

  /** CloudDOM node attached by useInstance call (if any) - singular form (legacy) */
  cloudDOMNode?: CloudDOMNode;

  /** Hooks attached by useState/useEffect calls (if any) */
  hooks?: any[];

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

  /** Internal: Cached shallow hash of props for fast diff (optional) */
  _propHash?: string;
}

/**
 * JSX Element type
 */
export interface JSXElement {
  type: any;
  props: any;
  key?: string | number;
}

/**
 * ChangeSet represents the minimal set of operations to reconcile two CloudDOM states
 * 
 * REQ-O01: State Machine needs diff to detect changes
 * REQ-O04: Plan Command needs diff to show preview
 */
export interface ChangeSet {
  /** Nodes that exist in current but not in previous (need to be created) */
  creates: CloudDOMNode[];

  /** Nodes that exist in both but have different props (need to be updated) */
  updates: CloudDOMNode[];

  /** Nodes that exist in previous but not in current (need to be deleted) */
  deletes: CloudDOMNode[];

  /** Nodes that changed type (need to be replaced: delete + create) */
  replacements: CloudDOMNode[];

  /** Nodes that moved in the hierarchy (includes node ID for traceability) */
  moves: Array<{ nodeId: string; from: string; to: string }>;

  /** Deployment order based on dependency graph (topologically sorted) */
  deploymentOrder: string[];

  /** Parallel deployment batches (nodes at same depth can deploy in parallel) */
  parallelBatches: string[][];
}

/**
 * DependencyGraph represents resource dependencies for deployment ordering
 * 
 * Maps node ID → array of dependency IDs
 */
export interface DependencyGraph {
  /** Adjacency list: node ID → dependency IDs */
  dependencies: Map<string, string[]>;

  /** Reverse adjacency list: node ID → dependent IDs (nodes that depend on this node) */
  dependents: Map<string, string[]>;
}
