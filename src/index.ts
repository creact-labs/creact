/**
 * CReact - Universal Reactive Runtime
 */

// JSX
export { createElement, Fragment, jsx, jsxs } from './jsx/jsx-runtime';
export { createContext, useContext } from './primitives/context';
// Primitives
export { useInstance } from './primitives/instance';
export { createStore } from './primitives/store';
export type {
  AuditLogEntry,
  Backend,
  ChangeSet,
  DeploymentState,
  DeploymentStatus,
  ResourceState,
  SerializedNode,
} from './provider/backend';
// Backend
export { serializeNode, serializeNodes } from './provider/backend';
export type { OutputChangeEvent, Provider } from './provider/interface';
// Provider
export { createMockProvider } from './provider/interface';
// Reactive
export { createEffect, onCleanup } from './reactive/effect';
export { createSignal } from './reactive/signal';
export { batch, untrack } from './reactive/tracking';
export type { DependencyGraph } from './runtime/reconcile';
// Reconciler
export {
  buildDependencyGraph,
  computeParallelBatches,
  hasNewNodes,
  reconcile,
  topologicalSort,
} from './runtime/reconcile';
export type { CReactOptions } from './runtime/run';
// Runtime
export { CReact, renderCloudDOM, resetRuntime, run, runWithBackend } from './runtime/run';
export type { StateMachineOptions } from './runtime/state-machine';
export { StateMachine } from './runtime/state-machine';

// Types
export type {
  Accessor,
  Context,
  Fiber,
  InstanceNode,
  JSXElement,
  OutputAccessors,
  SetStoreFunction,
  Setter,
} from './types';
