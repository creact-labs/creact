/**
 * Signal - core reactive primitive (internal)
 * Inspired by SolidJS createSignal
 */

import { getCurrentFiber, getNextHookIndex } from '../runtime/render';
import { getListener, scheduleComputation } from './tracking';

/**
 * Signal state - holds value and tracks observers
 */
export interface Signal<T> {
  value: T | undefined;
  observers: Computation<any>[] | null;
  observerSlots: number[] | null;
}

/**
 * Computation - tracks dependencies and re-runs when they change
 */
export interface Computation<T> {
  fn: () => T;
  sources: Signal<any>[] | null;
  sourceSlots: number[] | null;
  state: 0 | 1 | 2; // CLEAN | STALE | PENDING
  cleanups: (() => void)[] | null;
}

export type Accessor<T> = () => T | undefined;
export type Setter<T> = (value: T | ((prev: T | undefined) => T)) => void;

/**
 * Create a reactive signal (memoized per fiber)
 * Returns a getter/setter pair for fine-grained reactivity
 *
 * When called inside a component, signals are memoized to persist across re-renders.
 * This allows components to re-run (like React) while keeping signal identity stable.
 */
export function createSignal<T>(initial?: T): [Accessor<T>, Setter<T>] {
  // Check if we're inside a component render
  const fiber = getCurrentFiber();

  if (fiber) {
    // Memoize signal per fiber + hook index
    const hookIndex = getNextHookIndex();

    if (!fiber.hooks) {
      fiber.hooks = [];
    }

    // Return existing signal if already created
    if (fiber.hooks[hookIndex]) {
      return fiber.hooks[hookIndex];
    }

    // Create new signal and store in hooks
    const result = createSignalInternal<T>(initial);
    fiber.hooks[hookIndex] = result;
    return result;
  }

  // Outside component - create non-memoized signal
  return createSignalInternal<T>(initial);
}

/**
 * Internal signal creation (not memoized)
 * Exported for use in useInstance where memoization causes signal sharing bugs
 */
export function createSignalInternal<T>(initial?: T): [Accessor<T>, Setter<T>] {
  const signal: Signal<T> = {
    value: initial,
    observers: null,
    observerSlots: null,
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
    const newValue = typeof value === 'function'
      ? (value as (prev: T | undefined) => T)(signal.value)
      : value;

    if (signal.value === newValue) return; // No change
    signal.value = newValue;

    // Notify all observers
    if (signal.observers?.length) {
      for (const observer of signal.observers) {
        observer.state = 1; // STALE
        scheduleComputation(observer);
      }
    }
  }

  return [read, write];
}

/**
 * Get raw signal value without tracking
 */
export function peekSignal<T>(signal: Signal<T>): T | undefined {
  return signal.value;
}
