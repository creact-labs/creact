import type { DeploymentState, Memory } from "@creact-labs/creact";

/**
 * In-memory backend so the example runs anywhere; swap for a persistent
 * Memory implementation in a real deployment.
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
