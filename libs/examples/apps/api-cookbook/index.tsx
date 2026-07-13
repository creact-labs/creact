/**
 * API tour: a full CReact app whose src modules hold every code sample
 * shown on the docs API pages. Run it with `creact index.tsx`; CI
 * typechecks it, so no published sample can drift from the library.
 */
import { type Memory, render, useAsyncOutput } from "@creact-labs/creact";
import { basicUsage } from "./src/reactive/create-signal";

function createMemory(): Memory {
  const states = new Map<
    string,
    Awaited<ReturnType<Memory["getState"]>>
  >();
  return {
    async getState(stackName) {
      return states.get(stackName) ?? null;
    },
    async saveState(stackName, state) {
      if (state) states.set(stackName, state);
    },
  };
}

function Tour() {
  useAsyncOutput({}, async (_props, setOutputs) => {
    basicUsage();
    setOutputs({ toured: true });
  });
  return <></>;
}

export default async function () {
  return render(() => <Tour key="tour" />, createMemory(), "api-cookbook");
}
