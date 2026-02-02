/**
 * CReact - Universal Reactive Runtime
 */

// JSX
export { createElement, Fragment, jsx, jsxs } from './jsx/jsx-runtime';
export { createContext, useContext } from './primitives/context';

// Primitives
export { useInstance } from './primitives/instance';
export { createStore } from './primitives/store';
export { createEffect } from './reactive/effect';
export { createSignal } from './reactive/signal';
export { untrack } from './reactive/tracking';
export type { Accessor, Setter } from './reactive/signal';

// Runtime
export { CReact, renderCloudDOM } from './runtime/run';

// Backend (for custom implementations)
export type { AuditLogEntry, Backend, DeploymentState } from './provider/backend';

// Provider (for custom implementations)
export type { OutputChangeEvent, Provider } from './provider/interface';
export { createMockProvider } from './provider/interface';

// Types
export type {
  Context,
  InstanceNode,
  JSXElement,
  OutputAccessors,
  SetStoreFunction,
} from './types';
