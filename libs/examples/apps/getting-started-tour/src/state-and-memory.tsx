/**
 * Samples for the state-and-memory page. The FileMemory sample lives in
 * ./memory.ts and the render() entry sample is the app's own index.tsx;
 * this module holds the remaining regions.
 */
// #region memory-interface
import type { DeploymentState, Memory } from "@creact-labs/creact";

class MyMemory implements Memory {
  async getState(stackName: string): Promise<DeploymentState | null> {
    // Load previously saved state, or null on first run
    return null;
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    // Persist state after each render cycle
  }
}
// #endregion memory-interface

// #region use-async-output
import { createEffect, useAsyncOutput } from "@creact-labs/creact";

function Counter() {
  const counter = useAsyncOutput({}, async (_props, setOutputs) => {
    // On restart, prev.count holds the last saved value
    setOutputs((prev) => ({ count: prev?.count ?? 0 }));

    const interval = setInterval(() => {
      setOutputs((prev) => ({ count: (prev?.count ?? 0) + 1 }));
    }, 1000);

    return () => clearInterval(interval);
  });

  createEffect(() => {
    console.log("Count:", counter.count());
  });

  return <></>;
}
// #endregion use-async-output

export { Counter, MyMemory };
