/**
 * Samples for the reactive-primitives page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
// #region signals
import { createEffect, createSignal } from "@creact-labs/creact";

const [count, setCount] = createSignal(0);

createEffect(() => {
  console.log(count()); // Tracks count, re-runs on change
});

setCount(1); // Logs: 1
setCount((c) => c + 1); // Logs: 2 (functional update)
// #endregion signals

import { batch, createMemo, untrack } from "@creact-labs/creact";

const [name] = createSignal("world");

// #region effects
createEffect(() => {
  // Runs whenever name() or count() changes
  console.log(`${name()} has count: ${count()}`);
});
// #endregion effects

export function memos() {
  // #region memos
  const [count, setCount] = createSignal(0);
  const doubled = createMemo(() => count() * 2);

  console.log(doubled()); // 0
  setCount(5);
  console.log(doubled()); // 10
  // #endregion memos
}

export function batching() {
  const [, setFirstName] = createSignal("");
  const [, setLastName] = createSignal("");
  const [, setAge] = createSignal(0);

  // #region batching
  batch(() => {
    setFirstName("John");
    setLastName("Doe");
    setAge(30);
  });
  // Effects depending on any of these run once, not three times
  // #endregion batching
}

export function untracking() {
  const [a] = createSignal(1);
  const [b] = createSignal(2);

  // #region untrack
  createEffect(() => {
    // Only re-runs when a() changes, not b()
    console.log(a(), untrack(b));
  });
  // #endregion untrack
}
