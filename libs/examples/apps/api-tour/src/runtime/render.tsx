/**
 * Samples for the render API page. Each region is displayed by the
 * website; wrapping functions keep every fragment compiling for real.
 */
import type { DeploymentState, Memory } from "@creact-labs/creact";

/**
 * Stand-in for a file-backed Memory implementation — in-memory here so the
 * tour runs anywhere; a real app would persist to disk.
 */
class FileMemory implements Memory {
  private readonly states = new Map<string, DeploymentState>();

  constructor(readonly path: string) {}

  async getState(stackName: string): Promise<DeploymentState | null> {
    return this.states.get(stackName) ?? null;
  }

  async saveState(stackName: string, state: DeploymentState): Promise<void> {
    this.states.set(stackName, state);
  }
}

function App() {
  return <></>;
}

const memory = new FileMemory("./.state");

// #region hero
import { render } from "@creact-labs/creact";

export default async function () {
  return render(() => <App />, memory, "my-app");
}
// #endregion hero

export async function usage() {
  // #region usage
  const memory = new FileMemory("./.state");
  const result = render(() => <App />, memory, "my-stack");
  await result.ready;
  // #endregion usage
  return result;
}
