// #region counter-handler
import {
  createEffect,
  useAsyncOutput,
  type Handler,
} from "@creact-labs/creact";

const counterHandler: Handler<Record<string, never>, { count: number }> =
  async (_props, setOutputs) => {
    setOutputs((prev) => ({ count: prev?.count ?? 0 }));

    const interval = setInterval(() => {
      setOutputs((prev) => ({ count: (prev?.count ?? 0) + 1 }));
    }, 1000);

    return () => clearInterval(interval);
  };
// #endregion counter-handler

// #region counter
function Counter() {
  const counter = useAsyncOutput({}, counterHandler);

  createEffect(() => {
    console.log("Count:", counter.count());
  });

  return <></>;
}
// #endregion counter

// #region app
export function App() {
  return <Counter key="counter" />;
}
// #endregion app
