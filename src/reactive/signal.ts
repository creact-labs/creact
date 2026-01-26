/**
 * Signal - core reactive primitive (internal)
 * Inspired by SolidJS createSignal
 */

import { getListener, scheduleComputation } from './tracking.js';

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
export type Setter<T> = (value: T) => void;

/**
 * Create a reactive signal (internal - not exported from package)
 */
export function createSignal<T>(initial?: T): [Accessor<T>, Setter<T>] {
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
        listener.sourceSlots!.push(sSlot);
      }

      // Signal tracks this listener
      if (!signal.observers) {
        signal.observers = [listener];
        signal.observerSlots = [listener.sources.length - 1];
      } else {
        signal.observers.push(listener);
        signal.observerSlots!.push(listener.sources.length - 1);
      }
    }

    return signal.value;
  }

  function write(value: T): void {
    if (signal.value === value) return; // No change
    signal.value = value;

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
