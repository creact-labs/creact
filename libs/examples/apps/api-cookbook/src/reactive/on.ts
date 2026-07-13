/**
 * Samples for the on API page. Each region is displayed by the website;
 * wrapping functions keep every fragment compiling for real.
 */
import { createEffect, createSignal, on } from "@creact-labs/creact";

const [count] = createSignal(0);

export function hero() {
  // #region hero
  createEffect(on(count, (value, prev) => {
    console.log(`Changed from ${prev} to ${value}`);
  }));
  // #endregion hero
}

export function singleDependency() {
  // #region single-dep
  createEffect(on(count, (value, prev) => {
    console.log(`count: ${prev} → ${value}`);
  }));
  // #endregion single-dep
}

export function multipleDependencies() {
  const [firstName] = createSignal("John");
  const [lastName] = createSignal("Doe");
  // #region multiple-deps
  createEffect(on([firstName, lastName], ([first, last], prev) => {
    console.log(`Name: ${first} ${last}`);
  }));
  // #endregion multiple-deps
}

export function deferredExecution() {
  // #region deferred
  createEffect(on(count, (value) => {
    // Skips initial run, only fires on changes
    console.log('Changed to:', value);
  }, { defer: true }));
  // #endregion deferred
}
