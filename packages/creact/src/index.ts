/**
 * CReact - Use JSX to automate durable workflows
 */

export { ErrorBoundary } from "./flow/error-boundary";
export { For } from "./flow/for";
// Control Flow
export { Show } from "./flow/show";
export { Match, Switch } from "./flow/switch";
export type {
  Handler,
  InstanceNode,
  OutputAccessors,
} from "./runtime/instance";
// Instance/Handler (CReact-specific)
export { useAsyncOutput } from "./runtime/instance";
export type {
  AuditLogEntry,
  DeploymentState,
  Memory,
} from "./runtime/memory";
export type { RuntimeOutputs } from "./runtime/create-runtime";
export { createRuntime } from "./runtime/create-runtime";
export type { RenderOptions, RenderResult } from "./runtime/run";
// Runtime
export { render, resetRuntime } from "./runtime/run";
export type { SetStoreFunction } from "./store/store";
// Store
export { createStore, unwrap } from "./store/store";
export type { CReactNode, JSXElement } from "./jsx/jsx-runtime";
// JSX
export { createElement, Fragment, jsx, jsxs } from "./jsx/jsx-runtime";
export type { ChildrenReturn, ResolvedChildren } from "./primitives/children";
export { children } from "./primitives/children";
export type { Context } from "./primitives/context";
// Context
export { createContext, useContext } from "./primitives/context";
// Component Utilities
export { mergeProps, splitProps } from "./primitives/props";
// Array Utilities
export { indexArray, mapArray } from "./reactive/array";
export {
  createComputed,
  createEffect,
  createReaction,
  createRenderEffect,
  onMount,
} from "./reactive/effect";
export type { Owner } from "./reactive/owner";
export {
  createRoot,
  getOwner,
  onCleanup,
  runWithOwner,
} from "./reactive/owner";
export { createSelector } from "./reactive/selector";
// Types
export type {
  Accessor,
  MaybeAccessor,
  MemoOptions,
  Setter,
  SignalOptions,
} from "./reactive/signal";
// Reactive Core
export {
  access,
  catchError,
  createMemo,
  createSignal,
  on,
} from "./reactive/signal";
export { batch, untrack } from "./reactive/tracking";
