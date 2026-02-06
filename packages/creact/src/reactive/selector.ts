/**
 * createSelector — O(2) reactive selection primitive
 */

import { createComputation, onCleanup } from "./effect";
import type { Accessor, Computation } from "./signal";
import {
  getListener,
  STALE,
  scheduleUpdate,
  updateComputation,
} from "./tracking";

type EqualityCheckerFunction<T, U> = (a: U, b: T) => boolean;

const equalFn = <T>(a: T, b: T) => a === b;

/**
 * Creates a conditional signal that efficiently tracks which items match a
 * selector value. Optimises from O(n) to O(2) updates by maintaining a
 * Map of key → subscriber sets and only notifying the previous and current
 * matches when the source changes.
 */
export function createSelector<T, U = T>(
  source: Accessor<T>,
  fn: EqualityCheckerFunction<T, U> = equalFn as EqualityCheckerFunction<T, U>,
): (key: U) => boolean {
  const subs = new Map<U, Set<Computation<any>>>();
  const node = createComputation(
    (p: T | undefined) => {
      const v = source();
      for (const [key, val] of subs.entries()) {
        if (fn(key, v) !== fn(key, p!)) {
          for (const c of val.values()) {
            c.state = STALE;
            scheduleUpdate(c);
          }
        }
      }
      return v;
    },
    undefined,
    true, // pure
    STALE as 0 | 1 | 2,
  );
  updateComputation(node);

  return (key: U): boolean => {
    const listener = getListener();
    if (listener) {
      let l: Set<Computation<any>> | undefined;
      if ((l = subs.get(key))) l.add(listener);
      else subs.set(key, (l = new Set([listener])));
      onCleanup(() => {
        l!.delete(listener);
        if (!l!.size) subs.delete(key);
      });
    }
    return fn(key, node.value as T);
  };
}
