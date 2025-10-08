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
  key?: string | number;

  /** Reactive state tracking for re-rendering system */
  reactiveState?: {
    /** Reason for the last re-render */
    lastRenderReason?: ReRenderReason;

    /** Timestamp of the last render */
    lastRenderTime?: number;

    /** Total number of times this component has been rendered */
    renderCount: number;

    /** Whether this component needs re-rendering */
    isDirty: boolean;

    /** Whether this component has a pending update (mark-and-sweep model) */
    updatePending: boolean;

    /** Context IDs that triggered the pending update (for debugging) */
    pendingContexts?: Set<symbol>;
  };

  /** Dependency tracking for selective re-rendering */
  dependencies?: Set<FiberNode>;

  /** Components that depend on this component */
  dependents?: Set<FiberNode>;
}

/**
 * CloudDOM Event Callbacks - Lifecycle event handlers for resources
 * These are extracted from component props and triggered during deployment
 */
export interface CloudDOMEventCallbacks {
  /** Called when resource deployment starts */
  onDeploy?: (context: CloudDOMEventContext) => void | Promise<void>;

  /** Called when resource deployment fails */
  onError?: (context: CloudDOMEventContext, error: Error) => void | Promise<void>;

  /** Called when resource is destroyed/deleted */
  onDestroy?: (context: CloudDOMEventContext) => void | Promise<void>;
}

/**
 * CloudDOM Event Context - Information passed to event callbacks
 */
export interface CloudDOMEventContext {
  /** Resource ID */
  resourceId: string;

  /** Resource path */
  path: string[];

  /** Construct type */
  construct: any;

  /** Resource props (without event callbacks) */
  props: Record<string, any>;

  /** Resource outputs (if available) */
  outputs?: Record<string, any>;

  /** Deployment phase */
  phase: 'deploy' | 'error' | 'destroy';

  /** Timestamp when event occurred */
  timestamp: number;
}

/**
 * Event callback props that are automatically available to components using useInstance
 */
export interface CloudDOMEventProps {
  /** Called when resource deployment starts */
  onDeploy?: (ctx: CloudDOMEventContext) => void | Promise<void>;

  /** Called when resource deployment fails */
  onError?: (ctx: CloudDOMEventContext, error: Error) => void | Promise<void>;

  /** Called when resource is destroyed/deleted */
  onDestroy?: (ctx: CloudDOMEventContext) => void | Promise<void>;
}

/**
 * Utility type that adds event callback props to any component props
 * Use this for components that call useInstance
 */
export type WithCloudDOMEvents<T = {}> = T & CloudDOMEventProps;

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

  /** Event callbacks extracted from component props (optional) */
  eventCallbacks?: CloudDOMEventCallbacks;

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

/**
 * ReRenderReason - Reasons why a component re-render was triggered
 * Used for debugging, performance monitoring, and selective re-rendering
 * 
 * Note: useState changes alone do NOT trigger re-renders in CReact.
 * Re-renders only occur when provider outputs that are bound to state change.
 */
export type ReRenderReason =
  | 'output-update'     // Provider output bound to state changed (primary reason)
  | 'context-change'    // Context value changed
  | 'structural-change' // JSX structure changed (conditional useInstance)
  | 'hot-reload'        // File change in development mode
  | 'manual';           // Programmatic re-render trigger

/**
 * CReactEvents - Lifecycle event hooks for reactive system
 * Optional interface for tooling, debugging, and performance monitoring
 */
export interface CReactEvents {
  /** Called when a component render starts */
  onRenderStart(fiber: FiberNode): void;

  /** Called when a component render completes successfully */
  onRenderComplete(fiber: FiberNode): void;

  /** Called when deployment starts for a stack */
  onDeployStart(stack: string): void;

  /** Called when deployment completes successfully for a stack */
  onDeployComplete(stack: string): void;

  /** Called when an error occurs during rendering or deployment */
  onError(error: Error, fiber?: FiberNode): void;

  /** Called when a context value is updated (for observability) */
  onContextUpdate?(contextId: symbol, previousValue: any, newValue: any): void;

  /** Called when a fiber is scheduled for re-render (for telemetry/visualization) */
  onFiberReRenderScheduled?(fiber: FiberNode, reason: ReRenderReason, contextId?: symbol): void;
}

/**
 * OutputBinding - Tracks binding between component state and provider outputs
 * Used by StateBindingManager to detect when outputs change
 */
export interface OutputBinding {
  /** CloudDOM node ID that provides the output */
  nodeId: string;

  /** Output key from the provider */
  outputKey: string;

  /** Last known value of the output */
  lastValue: any;

  /** Timestamp when binding was created */
  bindTime: number;

  /** Timestamp when binding was last updated (optional, for observability) */
  lastUpdate?: number;
}

/**
 * OutputChange - Represents a change in provider output
 * Used to track what changed and which components are affected
 */
export interface OutputChange {
  /** CloudDOM node ID that changed */
  nodeId: string;

  /** Output key that changed */
  outputKey: string;

  /** Previous value */
  previousValue: any;

  /** New value */
  newValue: any;

  /** Fiber nodes affected by this change */
  affectedFibers: FiberNode[];
}
