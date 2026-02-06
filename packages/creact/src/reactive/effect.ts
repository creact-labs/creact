/**
 * createEffect - run side effects when dependencies change
 */

import { getOwner } from "./owner";
import type { Computation } from "./signal";
import { STALE, scheduleEffect, untrack, updateComputation } from "./tracking";

// Magic type that prevents inference at sites where used
type NoInfer<T> = [T][T extends any ? 0 : never];

type EffectFunction<Prev, Next extends Prev = Prev> = (v: Prev) => Next;

export interface EffectOptions {
  name?: string;
}

/**
 * Create a computation
 * @internal — also used by createSelector
 */
export function createComputation<Next, Init = unknown>(
  fn: EffectFunction<Init | Next, Next>,
  init: Init,
  pure: boolean,
  state: 0 | 1 | 2 = STALE as 0 | 1 | 2,
  options?: EffectOptions,
): Computation<Init | Next> {
  const owner = getOwner();

  const c: Computation<Init | Next> = {
    fn,
    state,
    updatedAt: null,
    owned: null,
    sources: null,
    sourceSlots: null,
    cleanups: null,
    value: init,
    owner,
    context: owner ? owner.context : null,
    pure,
    name: options?.name,
  };

  // Register with owner
  if (owner) {
    if (!owner.owned) owner.owned = [];
    owner.owned.push(c);
  }

  return c;
}

/**
 * Create a reactive effect that runs when dependencies change
 *
 * Effects run after the render phase. The effect function receives its
 * previous return value and can return a new value for the next run.
 * Use onCleanup() inside the effect to register cleanup functions.
 */
export function createEffect<Next>(
  fn: EffectFunction<undefined | NoInfer<Next>, Next>,
): void;
export function createEffect<Next, Init = Next>(
  fn: EffectFunction<Init | Next, Next>,
  value: Init,
  options?: EffectOptions & { render?: boolean },
): void;
export function createEffect<Next, Init>(
  fn: EffectFunction<Init | Next, Next>,
  value?: Init,
  options?: EffectOptions & { render?: boolean },
): void {
  const c = createComputation(fn, value!, false, STALE as 0 | 1 | 2, options);

  // User effects run after render effects
  if (!options || !options.render) c.user = true;

  // Queue effect or run immediately if no queue exists
  scheduleEffect(c);
}

/**
 * Creates a reactive computation that runs immediately (like render effects)
 * Used internally for component render tracking
 * Render effects always run immediately - they don't queue to Effects
 */
export function createRenderEffect<Next>(
  fn: EffectFunction<undefined | NoInfer<Next>, Next>,
): void;
export function createRenderEffect<Next, Init = Next>(
  fn: EffectFunction<Init | Next, Next>,
  value: Init,
  options?: EffectOptions,
): void;
export function createRenderEffect<Next, Init>(
  fn: EffectFunction<Init | Next, Next>,
  value?: Init,
  options?: EffectOptions,
): void {
  const c = createComputation(fn, value!, false, STALE as 0 | 1 | 2, options);
  // No user flag - render effects run first and always run immediately
  updateComputation(c);
}

/**
 * Creates a reactive computation that runs immediately before render
 * Mainly used to write to other reactive primitives
 */
export function createComputed<Next>(
  fn: EffectFunction<undefined | NoInfer<Next>, Next>,
): void;
export function createComputed<Next, Init = Next>(
  fn: EffectFunction<Init | Next, Next>,
  value: Init,
  options?: EffectOptions,
): void;
export function createComputed<Next, Init>(
  fn: EffectFunction<Init | Next, Next>,
  value?: Init,
  options?: EffectOptions,
): void {
  const c = createComputation(fn, value!, true, STALE as 0 | 1 | 2, options);
  // Pure computations run immediately
  updateComputation(c);
}

/**
 * Run code once when the component mounts
 */
export function onMount(fn: () => void): void {
  createEffect(() => {
    untrack(fn);
    return undefined;
  });
}

/**
 * Register a cleanup function for the current owner/computation
 *
 * Registers on the current Owner (which could be a computation
 * since Computation extends Owner).
 */
export function onCleanup<T extends () => any>(fn: T): T {
  const owner = getOwner();
  if (owner === null) {
    console.warn(
      "cleanups created outside a `createRoot` or `render` will never be run",
    );
  } else if (owner.cleanups === null) {
    owner.cleanups = [fn];
  } else {
    owner.cleanups.push(fn);
  }
  return fn;
}

/**
 * Creates a reactive tracker that separates tracking from side effects.
 * Returns a function that accepts a tracking expression — when any signal
 * read inside that expression changes, `onInvalidate` fires once, then
 * tracking stops until re-armed by calling the returned function again.
 */
export function createReaction(
  onInvalidate: () => void,
  options?: EffectOptions,
): (tracking: () => void) => void {
  let fn: (() => void) | undefined;
  const c = createComputation(
    () => {
      fn ? fn() : untrack(onInvalidate);
      fn = undefined;
    },
    undefined,
    false,
    0 as 0 | 1 | 2, // initial state is CLEAN — no immediate execution
    options,
  );
  c.user = true;

  return (tracking: () => void) => {
    fn = tracking;
    updateComputation(c);
  };
}
