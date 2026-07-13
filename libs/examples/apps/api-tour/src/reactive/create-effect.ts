/**
 * Samples for the createEffect API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createEffect, createSignal, onCleanup } from "@creact-labs/creact";

const [count, setCount] = createSignal(0);
const tick = () => setCount((c) => c + 1);

export function hero() {
  // #region hero
  createEffect(() => {
    console.log("Count is:", count());
  });
  // #endregion hero
}

export function trackingDependencies() {
  // #region tracking
  const [a, setA] = createSignal(1);
  const [b, setB] = createSignal(2);

  createEffect(() => {
    // Re-runs when a() OR b() changes
    console.log(a() + b());
  });
  // #endregion tracking
  setA(2);
  setB(3);
}

export function usingPreviousValue() {
  // #region with-previous
  createEffect((prev) => {
    const current = count();
    console.log(`Changed from ${prev} to ${current}`);
    return current;
  }, 0);
  // #endregion with-previous
}

export function cleanupWithOnCleanup() {
  // #region cleanup
  createEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    onCleanup(() => clearInterval(interval));
  });
  // #endregion cleanup
}
