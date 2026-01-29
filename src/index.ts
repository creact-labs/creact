/**
 * CReact - Universal Reactive Runtime
 */

// Primitives
export { useInstance } from './primitives/instance.js';
export { createStore } from './primitives/store.js';
export { createContext, useContext } from './primitives/context.js';

// Reactive
export { createEffect, onCleanup } from './reactive/effect.js';
export { batch, untrack } from './reactive/tracking.js';
export { createSignal } from './reactive/signal.js';

// Runtime
export { CReact, resetRuntime, renderCloudDOM, run, runWithBackend } from './runtime/run.js';
export type { CReactOptions } from './runtime/run.js';
export { StateMachine } from './runtime/state-machine.js';
export type { StateMachineOptions } from './runtime/state-machine.js';

// Reconciler
export {
  reconcile,
  hasNewNodes,
  buildDependencyGraph,
  topologicalSort,
  computeParallelBatches,
} from './runtime/reconcile.js';
export type { DependencyGraph } from './runtime/reconcile.js';

// Provider
export { createMockProvider } from './provider/interface.js';
export type { Provider, OutputChangeEvent } from './provider/interface.js';

// Backend
export { serializeNode, serializeNodes } from './provider/backend.js';
export type {
  Backend,
  DeploymentState,
  SerializedNode,
  ResourceState,
  DeploymentStatus,
  AuditLogEntry,
  ChangeSet,
} from './provider/backend.js';

// JSX
export { createElement, Fragment, jsx, jsxs } from './jsx/jsx-runtime.js';

// Types
export type {
  Accessor,
  Setter,
  Fiber,
  InstanceNode,
  OutputAccessors,
  Context,
  SetStoreFunction,
  JSXElement,
} from './types.js';
