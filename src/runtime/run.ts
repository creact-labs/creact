/**
 * Main runtime loop
 */

import type { InstanceNode } from '../primitives/instance.js';
import type { Provider } from '../provider/interface.js';
import { renderFiber, collectInstanceNodes } from './render.js';
import { reconcile, hasNewNodes } from './reconcile.js';
import { fillInstanceOutputs, clearNodeRegistry } from '../primitives/instance.js';
import { prepareHydration, clearHydration } from '../primitives/store.js';
import { clearContextStacks } from '../primitives/context.js';
import { flushSync } from '../reactive/tracking.js';

export interface RunOptions {
  maxIterations?: number;
}

/**
 * Run the reactive loop
 */
export async function run(
  rootElement: any,
  provider: Provider,
  previousNodes?: InstanceNode[],
  options: RunOptions = {}
): Promise<InstanceNode[]> {
  const { maxIterations = 10 } = options;
  let iteration = 0;

  // 1. Prepare hydration from previous state
  if (previousNodes) {
    prepareHydration(previousNodes);
  }

  // 2. Initial render
  const rootFiber = renderFiber(rootElement, []);
  let currentNodes = collectInstanceNodes(rootFiber);

  // 3. Reconcile and apply loop
  let prevNodes = previousNodes ?? [];

  while (iteration < maxIterations) {
    iteration++;

    // Reconcile
    const changes = reconcile(prevNodes, currentNodes);

    // If no changes, we're done
    if (
      changes.creates.length === 0 &&
      changes.updates.length === 0 &&
      changes.deletes.length === 0
    ) {
      break;
    }

    // Apply deletes
    for (const node of changes.deletes) {
      await provider.destroy(node);
    }

    // Apply creates and updates
    for (const node of [...changes.creates, ...changes.updates]) {
      const outputs = await provider.apply(node);
      fillInstanceOutputs(node.id, outputs);
    }

    // Wait for reactive updates to settle
    await flushSync();

    // Collect nodes again (may have changed due to reactive updates)
    prevNodes = currentNodes;
    currentNodes = collectInstanceNodes(rootFiber);

    // If no new nodes appeared, we're done
    if (!hasNewNodes(prevNodes, currentNodes)) {
      break;
    }
  }

  if (iteration >= maxIterations) {
    console.warn(`CReact: Max iterations (${maxIterations}) reached. Possible infinite loop.`);
  }

  return currentNodes;
}

/**
 * Reset all runtime state (for testing)
 */
export function resetRuntime(): void {
  clearNodeRegistry();
  clearHydration();
  clearContextStacks();
}
