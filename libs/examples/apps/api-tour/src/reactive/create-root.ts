/**
 * Samples for the createRoot API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import { createEffect, createRoot, createSignal } from "@creact-labs/creact";

// Test framework globals shown in the "In Tests" sample
declare function it(name: string, fn: () => void): void;
declare function expect(value: unknown): { toBe(expected: unknown): void };

export function basicRoot() {
  // #region basic
  const dispose = createRoot((dispose) => {
    const [count, setCount] = createSignal(0);

    createEffect(() => {
      console.log(count());
    });

    setCount(1);
    return dispose;
  });

  // Later: tear down all effects and cleanups
  dispose();
  // #endregion basic
}

export function inTests() {
  // #region testing
  it('signal tracks changes', () => {
    createRoot(() => {
      const [val, setVal] = createSignal(0);
      let observed = -1;
      createEffect(() => { observed = val(); });
      expect(observed).toBe(0);
      setVal(42);
      expect(observed).toBe(42);
    });
  });
  // #endregion testing
}
