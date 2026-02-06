/**
 * Signal - core reactive primitives
 */

import { getOwner, type Owner, setOwner } from "./owner";
import {
  getListener,
  markDownstream,
  registerHandleError,
  resolvePending,
  runUpdates,
  STALE,
  scheduleComputation,
  untrack,
  updateComputation,
} from "./tracking";

/**
 * Signal state - holds value and tracks observers
 */
export interface Signal<T> {
  value: T | undefined;
  observers: Computation<any>[] | null;
  observerSlots: number[] | null;
  comparator?: (prev: T, next: T) => boolean;
}

/**
 * Computation - tracks dependencies and re-runs when they change
 * Extends Owner for cleanup/ownership tracking
 */
export interface Computation<T> {
  fn: (v: T) => T;
  sources: Signal<any>[] | null;
  sourceSlots: number[] | null;
  state: 0 | 1 | 2; // CLEAN | STALE | PENDING
  cleanups: (() => void)[] | null;
  value?: T;
  updatedAt: number | null;
  pure: boolean;
  user?: boolean;
  name?: string;
  // Owner fields
  owned: any[] | null;
  owner: any | null;
  context: Record<symbol, unknown> | null;
}

/**
 * Memo extends both Signal and Computation
 */
export interface Memo<T> extends Signal<T>, Computation<T> {
  value: T | undefined;
}

export type Accessor<T> = () => T;
export type Setter<T> = (value: T | ((prev: T) => T)) => void;

/**
 * Value or accessor - for reactive props without a transpiler
 */
export type MaybeAccessor<T> = T | Accessor<T>;

/**
 * Unwrap a MaybeAccessor - calls it if it's a function
 */
export function access<T>(value: MaybeAccessor<T>): T {
  return typeof value === "function" && (value as Function).length === 0
    ? (value as Accessor<T>)()
    : (value as T);
}

export interface SignalOptions<T> {
  equals?: false | ((prev: T, next: T) => boolean);
  name?: string;
}

export interface MemoOptions<T> {
  equals?: false | ((prev: T, next: T) => boolean);
  name?: string;
}

const equalFn = <T>(a: T, b: T) => a === b;

/**
 * Create a reactive signal
 * Returns a getter/setter pair for fine-grained reactivity
 */
export function createSignal<T>(): [
  Accessor<T | undefined>,
  Setter<T | undefined>,
];
export function createSignal<T>(
  value: T,
  options?: SignalOptions<T>,
): [Accessor<T>, Setter<T>];
export function createSignal<T>(
  initial?: T,
  options?: SignalOptions<T>,
): [Accessor<T | undefined>, Setter<T | undefined>] {
  const signal: Signal<T> = {
    value: initial,
    observers: null,
    observerSlots: null,
    comparator:
      options?.equals === false ? undefined : (options?.equals ?? equalFn),
  };

  function read(): T | undefined {
    const listener = getListener();

    // If there's an active computation, register it
    if (listener) {
      const sSlot = signal.observers?.length ?? 0;

      // Listener tracks this signal
      if (!listener.sources) {
        listener.sources = [signal];
        listener.sourceSlots = [sSlot];
      } else {
        listener.sources.push(signal);
        listener.sourceSlots?.push(sSlot);
      }

      // Signal tracks this listener
      if (!signal.observers) {
        signal.observers = [listener];
        signal.observerSlots = [listener.sources.length - 1];
      } else {
        signal.observers.push(listener);
        signal.observerSlots?.push(listener.sources.length - 1);
      }
    }

    return signal.value;
  }

  function write(value: T | ((prev: T | undefined) => T)): void {
    // Support functional updates like React's setState
    const newValue =
      typeof value === "function"
        ? (value as (prev: T | undefined) => T)(signal.value)
        : value;

    // Check equality
    if (signal.comparator?.(signal.value as T, newValue)) return;
    signal.value = newValue;

    // Notify all observers - wrapped in runUpdates for proper batching
    if (signal.observers?.length) {
      runUpdates(() => {
        for (let i = 0; i < signal.observers!.length; i++) {
          const o = signal.observers![i]!;
          if (!o.state) {
            scheduleComputation(o);
            if ((o as any).observers) markDownstream(o);
          }
          o.state = STALE;
        }
      }, false);
    }
  }

  return [read, write] as [Accessor<T | undefined>, Setter<T | undefined>];
}

/**
 * Create a memoized computation
 * Only re-computes when dependencies change
 */
export function createMemo<T>(
  fn: (prev: T | undefined) => T,
  value?: T,
  options?: MemoOptions<T>,
): Accessor<T> {
  const owner = getOwner();

  const c: Memo<T> = {
    fn: fn as (v: T) => T,
    state: STALE,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value,
    owner: owner as Computation<any> | null,
    context: owner ? owner.context : null,
    pure: true,
    // Signal fields
    observers: null,
    observerSlots: null,
    comparator:
      options?.equals === false ? undefined : (options?.equals ?? equalFn),
  };

  // Register with owner
  if (owner) {
    if (!owner.owned) owner.owned = [];
    owner.owned.push(c as unknown as Computation<any>);
  }

  updateComputation(c as unknown as Computation<any>);

  // Return accessor that reads memo like a signal
  return function readMemo(): T {
    // If stale or pending, resolve before reading
    if (c.state) {
      if (c.state === STALE) {
        updateComputation(c as unknown as Computation<any>);
      } else {
        // PENDING: resolve upstream dependencies first
        resolvePending(c as unknown as Computation<any>);
      }
    }

    const listener = getListener();
    if (listener) {
      const sSlot = c.observers?.length ?? 0;

      if (!listener.sources) {
        listener.sources = [c];
        listener.sourceSlots = [sSlot];
      } else {
        listener.sources.push(c);
        listener.sourceSlots?.push(sSlot);
      }

      if (!c.observers) {
        c.observers = [listener];
        c.observerSlots = [listener.sources.length - 1];
      } else {
        c.observers.push(listener);
        c.observerSlots?.push(listener.sources.length - 1);
      }
    }

    return c.value as T;
  };
}

/**
 * Makes dependencies of a computation explicit
 */
// Single dependency
export function on<S, T>(
  deps: Accessor<S>,
  fn: (input: S, prevInput: S | undefined, prevValue: T | undefined) => T,
  options?: { defer?: boolean },
): (prevValue: T | undefined) => T;
// Array of dependencies — infers tuple type for input
export function on<S extends readonly unknown[], T>(
  deps: { [K in keyof S]: Accessor<S[K]> },
  fn: (input: S, prevInput: S | undefined, prevValue: T | undefined) => T,
  options?: { defer?: boolean },
): (prevValue: T | undefined) => T;
export function on<S, T>(
  deps: Accessor<S> | Accessor<any>[],
  fn: (input: S, prevInput: S | undefined, prevValue: T | undefined) => T,
  options?: { defer?: boolean },
): (prevValue: T | undefined) => T {
  const isArray = Array.isArray(deps);
  let prevInput: S | undefined;
  let defer = options?.defer;

  return (prevValue: T | undefined) => {
    let input: S;
    if (isArray) {
      input = Array((deps as Accessor<S>[]).length) as unknown as S;
      for (let i = 0; i < (deps as Accessor<S>[]).length; i++) {
        (input as unknown as any[])[i] = (deps as Accessor<S>[])[i]!();
      }
    } else {
      input = (deps as Accessor<S>)() as S;
    }

    if (defer) {
      defer = false;
      return prevValue as T;
    }

    const result = untrack(() => fn(input, prevInput, prevValue));
    prevInput = input;
    return result;
  };
}

// Error handling
let ERROR: symbol | null = null;

function getErrorSymbol(): symbol {
  if (!ERROR) ERROR = Symbol("error");
  return ERROR;
}

/**
 * Walk the owner chain looking for error handlers (catchError boundaries).
 * If found, calls the handler. If not found, re-throws.
 */
function handleError(err: unknown, owner: any): void {
  const sym = getErrorSymbol();
  const error = err instanceof Error ? err : new Error(String(err));
  const fns = sym && owner && owner.context && owner.context[sym];
  if (!fns) throw error;
  try {
    for (const f of fns as ((err: any) => void)[]) f(error);
  } catch (e) {
    handleError(e, owner?.owner ?? null);
  }
}

// Register handleError with tracking.ts (avoids circular import)
registerHandleError(handleError);

/**
 * Catch errors in child computations
 */
export function catchError<T>(
  fn: () => T,
  handler: (err: Error) => void,
): T | undefined {
  const sym = getErrorSymbol();
  const owner = getOwner();

  const errorOwner: Owner = {
    owned: null,
    cleanups: null,
    owner: owner,
    context: { ...owner?.context, [sym]: [handler] },
  };

  const prevOwner = setOwner(errorOwner);
  try {
    return fn();
  } catch (err) {
    handler(err instanceof Error ? err : new Error(String(err)));
    return undefined;
  } finally {
    setOwner(prevOwner);
  }
}

/**
 * Get raw signal value without tracking
 */
export function peekSignal<T>(signal: Signal<T>): T | undefined {
  return signal.value;
}
