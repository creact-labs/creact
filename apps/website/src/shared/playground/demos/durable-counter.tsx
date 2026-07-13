import { render, useAsyncOutput, createEffect } from "@creact-labs/creact";
import { inspect, InspectMemory } from "./inspector.mjs";

function Counter() {
  const counter = useAsyncOutput({}, async (_props, setOutputs) => {
    setOutputs((prev) => ({ count: prev?.count ?? 0 }));
    const id = setInterval(
      () => setOutputs((prev) => ({ count: (prev?.count ?? 0) + 1 })),
      1000,
    );
    return () => clearInterval(id);
  });

  createEffect(() => console.log("Count:", counter.count() ?? 0));
  return <></>;
}

export default async function () {
  const result = render(
    () => <Counter key="counter" />,
    new InspectMemory(),
    "durable-counter",
  );
  inspect(result);
  return result;
}
