/**
 * TestRuntime - Thin wrapper around CReact for testing
 *
 * Extends CReact with testing conveniences:
 * - simulateAndWait() for simulating provider events
 * - Assert helpers
 * - Iteration tracking
 */

import { CReact, type InstanceNode } from '../../src/index.js';
import { clearNodeRegistry } from '../../src/primitives/instance.js';
import { clearHydration } from '../../src/primitives/store.js';
import { clearContextStacks } from '../../src/primitives/context.js';
import { flushSync } from '../../src/reactive/tracking.js';
import type { MockProvider } from './mock-provider.js';
import { InMemoryBackend } from './in-memory-backend.js';

export type RenderStage =
  | 'idle'
  | 'rendering'
  | 'reconciling'
  | 'applying'
  | 'waiting-for-events';

export interface ConvergenceSnapshot {
  iteration: number;
  nodeCount: number;
  appliedTypes: string[];
}

export class TestRuntime extends CReact {
  private _iterations: ConvergenceSnapshot[] = [];

  constructor(public readonly provider: MockProvider) {
    super(provider, new InMemoryBackend());
  }

  /**
   * Run the runtime and return nodes (overload for testing convenience)
   */
  override async run(element: any, previousNodes?: InstanceNode[]): Promise<void> {
    this._iterations = [];

    await super.run(element, previousNodes);

    // Record final snapshot
    this._iterations.push({
      iteration: 1,
      nodeCount: this.nodes.length,
      appliedTypes: this.provider.getAppliedTypes(),
    });
  }

  get iterations(): ConvergenceSnapshot[] {
    return [...this._iterations];
  }

  get nodes(): InstanceNode[] {
    return this.getNodes();
  }

  get iterationCount(): number {
    return this._iterations.length;
  }

  /**
   * Simulate provider event and wait for reactive update
   * @param resourceName - The resource name (props.name) to simulate change for
   * @param outputs - The new outputs
   */
  async simulateAndWait(
    resourceName: string,
    outputs: Record<string, any>,
    _timeoutMs: number = 1000
  ): Promise<InstanceNode[]> {
    // Emit event - handleOutputChange will process it
    this.provider.simulateChange(resourceName, outputs);

    // Wait for async handling to complete
    await flushSync();
    await new Promise(r => setTimeout(r, 10));

    return this.nodes;
  }

  /**
   * Reset runtime state
   */
  reset(): void {
    this._iterations = [];
    clearNodeRegistry();
    clearHydration();
    clearContextStacks();
  }

  // Assert helpers
  assertNodeCount(expected: number): void {
    const actual = this.nodes.length;
    if (actual !== expected) {
      throw new Error(`Expected ${expected} nodes, got ${actual}`);
    }
  }

  assertAppliedInOrder(expectedTypes: string[]): void {
    const actualTypes = this.provider.getAppliedTypes();
    const actual = JSON.stringify(actualTypes);
    const expected = JSON.stringify(expectedTypes);
    if (actual !== expected) {
      throw new Error(`Expected apply order ${expected}, got ${actual}`);
    }
  }
}
