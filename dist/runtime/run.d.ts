/**
 * Main runtime loop
 */
import type { InstanceNode } from '../primitives/instance.js';
import type { Provider } from '../provider/interface.js';
export interface RunOptions {
    maxIterations?: number;
}
/**
 * Run the reactive loop
 */
export declare function run(rootElement: any, provider: Provider, previousNodes?: InstanceNode[], options?: RunOptions): Promise<InstanceNode[]>;
/**
 * Reset all runtime state (for testing)
 */
export declare function resetRuntime(): void;
