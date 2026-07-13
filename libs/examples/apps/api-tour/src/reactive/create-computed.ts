/**
 * Samples for the createComputed API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createComputed, createSignal } from "@creact-labs/creact";

export function hero() {
  const [firstName] = createSignal("John");
  const [lastName] = createSignal("Doe");
  const [fullName, setFullName] = createSignal("");
  // #region hero
  createComputed(() => {
    setFullName(`${firstName()} ${lastName()}`);
  });
  // #endregion hero
  return fullName();
}

export function usage() {
  // #region usage
  const [firstName, setFirstName] = createSignal('John');
  const [lastName, setLastName] = createSignal('Doe');
  const [fullName, setFullName] = createSignal('');

  createComputed(() => {
    setFullName(`${firstName()} ${lastName()}`);
  });

  console.log(fullName()); // 'John Doe'
  // #endregion usage
  setFirstName("Jane");
  setLastName("Roe");
}
