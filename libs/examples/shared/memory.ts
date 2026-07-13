import type { DeploymentState, Memory } from "@creact-labs/creact";

/**
 * In-memory backend shared by the example apps' entries and helpers.
 * Displayed samples that teach the Memory interface keep their own
 * inline implementations on purpose.
 */
export function createMemory(): Memory {
  const states = new Map<string, DeploymentState>();
  return {
    async getState(stackName) {
      return states.get(stackName) ?? null;
    },
    async saveState(stackName, state) {
      states.set(stackName, state);
    },
  };
}
