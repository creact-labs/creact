/**
 * Samples for the createMemo API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createMemo, createSignal } from "@creact-labs/creact";

const [count] = createSignal(1);

// #region hero
const doubled = createMemo(() => count() * 2);
// #endregion hero

export function derivedValues() {
  // #region derived-values
  const [items, setItems] = createSignal([1, 2, 3]);
  const total = createMemo(() => items().reduce((a, b) => a + b, 0));

  console.log(total()); // 6
  setItems([10, 20]);
  console.log(total()); // 30
  // #endregion derived-values
}

export function chainingMemos() {
  // #region chaining
  const [count, setCount] = createSignal(1);
  const doubled = createMemo(() => count() * 2);
  const quadrupled = createMemo(() => doubled() * 2);

  console.log(quadrupled()); // 4
  // #endregion chaining
  setCount(2);
}

export function customEquality(items: () => { active: boolean }[]) {
  // #region equality
  const filtered = createMemo(
    () => items().filter(i => i.active),
    [],
    { equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]) }
  );
  // #endregion equality
  return filtered();
}

export const heroValue = doubled;
