/**
 * CReact - Continuous Reactive Runtime with State Machine
 *
 * Event-driven runtime that:
 * 1. Renders JSX -> Fiber tree
 * 2. Reconciles and applies changes with dependency ordering
 * 3. Persists state to backend for crash recovery
 * 4. Subscribes to provider events
 * 5. When events arrive -> updates affected fibers -> re-renders -> applies new changes
 */
import type { InstanceNode } from '../primitives/instance.js';
import type { Provider, OutputChangeEvent } from '../provider/interface.js';
import type { Backend } from '../provider/backend.js';
import type { Fiber } from './fiber.js';
import { StateMachine } from './state-machine.js';
export interface CReactOptions {
    maxIterations?: number;
    /** User identifier for audit logs */
    user?: string;
    /** Enable audit logging (requires backend support) */
    enableAuditLog?: boolean;
}
/**
 * CReact - Continuous reactive runtime with state machine
 *
 * Subscribes to provider events and automatically re-renders
 * components when outputs change. This is event-driven, not poll-driven.
 *
 * Requires both:
 * - CReact.provider: Materializes resources (AWS, Terraform, etc.)
 * - CReact.backend: Persists deployment state (file, DynamoDB, etc.)
 */
export declare class CReact {
    static provider: Provider;
    static backend: Backend;
    private static _lastRuntime;
    private static _lastStackName;
    protected instanceProvider: Provider;
    protected instanceBackend: Backend;
    protected stateMachine: StateMachine;
    protected rootFiber: Fiber | null;
    protected currentNodes: InstanceNode[];
    protected options: CReactOptions;
    protected outputChangeHandler: ((change: OutputChangeEvent) => void) | null;
    protected stackName: string | null;
    constructor(provider: Provider, backend: Backend, options?: CReactOptions);
    /**
     * Start the runtime - render, apply, and begin listening for events
     *
     * @param element - JSX element to render
     * @param stackNameOrPrevious - Stack name (string) or previous nodes (array) for backward compat
     */
    run(element: any, stackNameOrPrevious?: string | InstanceNode[]): Promise<void>;
    /**
     * Apply changes between previous and current nodes
     *
     * Uses dependency ordering from reconciler:
     * 1. Apply deletes (reverse dependency order)
     * 2. Apply creates/updates in deployment order
     * 3. Recursively apply any new nodes that appeared
     *
     * With synchronous batching, fillInstanceOutputs triggers dependent
     * re-renders immediately. New nodes appear in registry right away.
     */
    protected applyChanges(previousNodes: InstanceNode[]): Promise<void>;
    /**
     * Handle provider output change events
     *
     * This is the event-driven part - when provider emits changes,
     * we update signals (triggering synchronous re-renders via batch),
     * and apply any new nodes.
     */
    protected handleOutputChange(change: OutputChangeEvent): Promise<void>;
    /**
     * Get current instance nodes (for debugging/testing)
     */
    getNodes(): InstanceNode[];
    /**
     * Get the state machine (for advanced usage)
     */
    getStateMachine(): StateMachine | null;
    /**
     * Stop the runtime
     */
    stop(): void;
    /**
     * Render CloudDOM - main entry point
     *
     * Usage:
     *   CReact.provider = myProvider;
     *   CReact.backend = myBackend;
     *   export default () => renderCloudDOM(<App />, 'my-stack');
     */
    static renderCloudDOM(element: any, stackName: string): Promise<InstanceNode[]>;
    /**
     * Get last runtime instance (for hot reload / CLI tooling)
     * Hot reload uses this to re-render with updated code without full restart
     */
    static getLastRuntime(): {
        runtime: CReact;
        stackName: string;
    } | null;
}
/**
 * Reset all runtime state (for testing)
 */
export declare function resetRuntime(): void;
/**
 * Convenience function to run once and return nodes (for testing)
 *
 * Creates a runtime with a simple in-memory backend and runs it.
 * Use this for tests where you don't need persistent state.
 */
export declare function run(rootElement: any, provider: Provider, previousNodes?: InstanceNode[], options?: CReactOptions): Promise<InstanceNode[]>;
/**
 * Run with explicit backend (for production use)
 */
export declare function runWithBackend(rootElement: any, provider: Provider, backend: Backend, stackName: string, options?: CReactOptions): Promise<InstanceNode[]>;
export declare const renderCloudDOM: typeof CReact.renderCloudDOM;
