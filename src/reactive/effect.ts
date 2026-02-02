/**
 * createEffect - run side effects when dependencies change
 */

import type { Computation } from './signal';
import { getCurrentFiber } from '../runtime/render';
import { getListener, runComputation } from './tracking';

/**
 * Create a reactive effect that runs when dependencies change
 *
 * Effects are attached to the current fiber and automatically cleaned up
 * when the component re-renders or unmounts.
 */
export function createEffect(fn: () => undefined | (() => void)): void {
  const fiber = getCurrentFiber();

  const computation: Computation<void> = {
    fn: () => {
      const cleanup = fn();
      if (typeof cleanup === 'function') {
        if (!computation.cleanups) {
          computation.cleanups = [cleanup];
        } else {
          computation.cleanups.push(cleanup);
        }
      }
    },
    sources: null,
    sourceSlots: null,
    state: 1, // STALE - needs initial run
    cleanups: null,
  };

  // Attach to fiber for cleanup on re-render/unmount
  if (fiber) {
    if (!fiber.effects) {
      fiber.effects = [];
    }
    fiber.effects.push(computation);
  }

  // Run immediately
  runComputation(computation);
}

/**
 * Register a cleanup function for the current computation
 */
export function onCleanup(fn: () => void): void {
  const listener = getListener();
  if (listener) {
    if (!listener.cleanups) {
      listener.cleanups = [fn];
    } else {
      listener.cleanups.push(fn);
    }
  }
}
