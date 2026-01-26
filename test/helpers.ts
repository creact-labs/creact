/**
 * Test helpers for CReact
 */

import {
  run,
  createMockProvider,
  type InstanceNode,
} from '../src/index.js';

export interface RenderOptions {
  apply?: (node: InstanceNode) => Record<string, any>;
  destroy?: (node: InstanceNode) => void;
  previousNodes?: InstanceNode[];
}

/**
 * Helper to run a component tree with a provider
 */
export async function renderWithProvider(
  element: any,
  options: RenderOptions = {}
): Promise<InstanceNode[]> {
  const provider = createMockProvider({
    apply: options.apply ?? (() => ({})),
    destroy: options.destroy,
  });
  return run(element, provider, options.previousNodes);
}
