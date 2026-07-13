/**
 * Samples for the batch API page. Each region is displayed by the website;
 * wrapping functions keep every fragment compiling for real.
 */
import { batch, createEffect, createSignal } from "@creact-labs/creact";

export function hero() {
  const [, setA] = createSignal(0);
  const [, setB] = createSignal(0);
  const [, setC] = createSignal(0);
  // #region hero
  batch(() => {
    setA(1);
    setB(2);
    setC(3);
  }); // Effects run once, not three times
  // #endregion hero
}

export function usage() {
  // #region usage
  const [firstName, setFirstName] = createSignal('');
  const [lastName, setLastName] = createSignal('');

  createEffect(() => {
    // Only runs once per batch, not twice
    console.log(`${firstName()} ${lastName()}`);
  });

  batch(() => {
    setFirstName('John');
    setLastName('Doe');
  }); // Logs: "John Doe" (once)
  // #endregion usage
}
