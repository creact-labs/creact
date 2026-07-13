/**
 * Samples for the Testing guide. Vitest-shaped stand-ins keep the specs
 * compiling without a test runner; in a real project install vitest
 * (`npm install -D vitest`) and import them from "vitest" instead.
 */
import {
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  Show,
  useAsyncOutput,
} from "@creact-labs/creact";

type TestBody = () => void | Promise<void>;
const describe = (_name: string, _body: TestBody): void => {};
const it = describe;
function expect(_actual: unknown) {
  return {
    toBe(_expected: unknown): void {},
    toBeFalsy(): void {},
  };
}

/** Component under test: persists a counter through its handler outputs */
function Counter(props: { initial: number }) {
  return useAsyncOutput({ initial: props.initial }, async (p, setOutputs) => {
    setOutputs({ count: p.initial });
  });
}

/** Marker component rendered by the flow test */
function Visible() {
  return <></>;
}

// #region testing-signals
describe("signals", () => {
  it("tracks changes", () => {
    createRoot(() => {
      const [count, setCount] = createSignal(0);
      let observed = 0;

      createEffect(() => {
        observed = count();
      });

      expect(observed).toBe(0);
      setCount(5);
      expect(observed).toBe(5);
    });
  });
});
// #endregion testing-signals

// #region testing-components
it("counter persists state", async () => {
  await createRoot(async () => {
    const counter = Counter({ initial: 10 });
    // Assert handler outputs via the returned accessors
  });
});
// #endregion testing-components

// #region testing-flow
it("Show renders when truthy", () => {
  createRoot(() => {
    const [show, setShow] = createSignal(false);
    const visible = <Visible />;

    const result = createMemo(() => {
      // Flow components return reactive accessors when called directly
      const r = Show({
        when: show,
        children: visible,
      }) as unknown as () => unknown;
      return r();
    });

    expect(result()).toBeFalsy();
    setShow(true);
    expect(result()).toBe(visible);
  });
});
// #endregion testing-flow
