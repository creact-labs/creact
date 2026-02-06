/**
 * CReact - A meta-runtime for building domain-specific, reactive execution engines.
 */

export { ErrorBoundary } from "../flow/src/ErrorBoundary";
export { For } from "../flow/src/For";
// Control Flow
export { Show } from "../flow/src/Show";
export { Match, Switch } from "../flow/src/Switch";
export type {
  Handler,
  InstanceNode,
  OutputAccessors,
} from "../runtime/src/instance";
// Instance/Handler (CReact-specific)
export { useAsyncOutput } from "../runtime/src/instance";
export type {
  AuditLogEntry,
  DeploymentState,
  Memory,
} from "../runtime/src/memory";
export type { RenderOptions, RenderResult } from "../runtime/src/run";
// Runtime
export { render, resetRuntime } from "../runtime/src/run";
export type { SetStoreFunction } from "../store/src/store";
// Store
export { createStore, unwrap } from "../store/src/store";
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
  onCleanup,
  onMount,
} from "./reactive/effect";
export type { Owner } from "./reactive/owner";
export { createRoot, getOwner, runWithOwner } from "./reactive/owner";
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
