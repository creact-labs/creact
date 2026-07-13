/**
 * Samples for the createSignal API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createEffect, createSignal } from "@creact-labs/creact";

// #region hero
const [count, setCount] = createSignal(0);
// #endregion hero

export function basicUsage() {
  // #region basic
  const [name, setName] = createSignal("world");

  createEffect(() => {
    console.log(`Hello, ${name()}!`);
  });

  setName("CReact"); // Logs: Hello, CReact!
  // #endregion basic
}

export function functionalUpdates() {
  // #region functional-updates
  setCount((c) => c + 1); // 1
  setCount((c) => c + 1); // 2
  // #endregion functional-updates
  return count();
}

export function customEquality(initialData: { id: number }) {
  // #region custom-equality
  // Never skip updates
  const [data, setData] = createSignal(initialData, { equals: false });

  // Custom comparator
  const [pos, setPos] = createSignal(
    { x: 0, y: 0 },
    { equals: (a, b) => a.x === b.x && a.y === b.y },
  );
  // #endregion custom-equality
  setData(data());
  setPos(pos());
}
