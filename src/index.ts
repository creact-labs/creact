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

// Runtime
export { run, resetRuntime } from './runtime/run.js';

// Provider
export { createMockProvider } from './provider/interface.js';
export type { Provider } from './provider/interface.js';

// JSX
export { createElement, Fragment, jsx, jsxs } from './jsx/jsx-runtime.js';

// Types
export type {
  Accessor,
  Setter,
  Fiber,
  ChangeSet,
  InstanceNode,
  OutputAccessors,
  Context,
  SetStoreFunction,
  JSXElement,
} from './types.js';
