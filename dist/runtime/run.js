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
import { serializeNodes } from '../provider/backend.js';
import { renderFiber, collectInstanceNodes, resetResourcePath } from './render.js';
import { reconcile, buildDependencyGraph, topologicalSort } from './reconcile.js';
import { fillInstanceOutputs, clearNodeRegistry, getNodeById, prepareOutputHydration, clearOutputHydration, clearNodeOwnership } from '../primitives/instance.js';
import { prepareHydration, clearHydration } from '../primitives/store.js';
import { clearContextStacks } from '../primitives/context.js';
// flushSync no longer needed - batch() flushes synchronously
import { StateMachine } from './state-machine.js';
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
export class CReact {
    // Singleton configuration (both required)
    static provider;
    static backend;
    // Internal storage for last runtime (for hot reload / CLI tooling)
    static _lastRuntime = null;
    static _lastStackName = null;
    instanceProvider;
    instanceBackend;
    stateMachine;
    rootFiber = null;
    currentNodes = [];
    options;
    outputChangeHandler = null;
    stackName = null;
    constructor(provider, backend, options = {}) {
        this.instanceProvider = provider;
        this.instanceBackend = backend;
        this.options = { maxIterations: 10, ...options };
        // Initialize state machine (always available now)
        this.stateMachine = new StateMachine(backend, {
            user: options.user,
            enableAuditLog: options.enableAuditLog,
        });
        // Subscribe to provider events immediately
        if (provider.on) {
            this.outputChangeHandler = (change) => this.handleOutputChange(change);
            provider.on('outputsChanged', this.outputChangeHandler);
        }
    }
    /**
     * Start the runtime - render, apply, and begin listening for events
     *
     * @param element - JSX element to render
     * @param stackNameOrPrevious - Stack name (string) or previous nodes (array) for backward compat
     */
    async run(element, stackNameOrPrevious) {
        // Handle backward compatibility: string = stackName, array = previousNodes
        let previousNodes;
        if (typeof stackNameOrPrevious === 'string') {
            this.stackName = stackNameOrPrevious;
        }
        else if (Array.isArray(stackNameOrPrevious)) {
            previousNodes = stackNameOrPrevious;
        }
        // Load previous state from backend if available
        if (this.instanceBackend && this.stackName && !previousNodes) {
            const prevState = await this.stateMachine?.getPreviousState(this.stackName);
            if (prevState) {
                // Restore resource states
                this.stateMachine?.restoreResourceStates(prevState.nodes);
                // Prepare hydration for createStore
                prepareHydration(prevState.nodes);
                // Prepare output hydration for useInstance
                prepareOutputHydration(prevState.nodes);
                // Use previous nodes for reconciliation
                previousNodes = prevState.nodes;
            }
        }
        else if (previousNodes) {
            prepareHydration(previousNodes);
            prepareOutputHydration(previousNodes);
        }
        // Clear ownership for new render pass (allows re-renders with same node IDs)
        clearNodeOwnership();
        // Initial render
        this.rootFiber = renderFiber(element, []);
        this.currentNodes = collectInstanceNodes(this.rootFiber);
        // Clear hydration maps after render (no longer needed)
        clearOutputHydration();
        // Initial apply cycle
        await this.applyChanges(previousNodes ?? []);
        // Runtime is now active - events will trigger handleOutputChange
        // For tests: return immediately (events still work)
        // For CLI: caller can await a keep-alive promise if needed
    }
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
    async applyChanges(previousNodes) {
        const changes = reconcile(previousNodes, this.currentNodes);
        if (changes.creates.length === 0 &&
            changes.updates.length === 0 &&
            changes.deletes.length === 0) {
            // No changes - update state machine to reflect stable state
            if (this.stackName) {
                await this.stateMachine.completeDeployment(this.stackName, serializeNodes(this.currentNodes));
            }
            return;
        }
        // Start deployment tracking
        if (this.stackName) {
            await this.stateMachine.startDeployment(this.stackName, changes, serializeNodes(this.currentNodes));
        }
        try {
            // Apply deletes (reverse order - children first)
            const deleteIds = changes.deletes.map((n) => n.id);
            const graph = buildDependencyGraph(changes.deletes);
            const deleteOrder = topologicalSort(deleteIds, graph).reverse();
            for (const nodeId of deleteOrder) {
                const node = changes.deletes.find((n) => n.id === nodeId);
                if (node) {
                    this.stateMachine.setResourceState(nodeId, 'applying');
                    await this.instanceProvider.destroy(node);
                    if (this.stackName) {
                        await this.stateMachine.recordResourceDestroyed(this.stackName, nodeId);
                    }
                }
            }
            // Materialize creates and updates in deployment order
            // With synchronous batching, fillInstanceOutputs triggers re-renders
            // immediately - new nodes appear in registry right after each materialize
            for (let i = 0; i < changes.deploymentOrder.length; i++) {
                const nodeId = changes.deploymentOrder[i];
                // Get current node state from registry (reflects signal updates from prior materializes)
                const node = getNodeById(nodeId);
                if (!node)
                    continue;
                this.stateMachine.setResourceState(nodeId, 'applying');
                // Materialize - provider calls node.setOutputs() when outputs are available
                // For sync providers: setOutputs() is called immediately, triggers reactive updates
                // For async providers: setOutputs() is called in callback, triggers reactive updates later
                await this.instanceProvider.materialize([node]);
                // Extract outputs for state recording (may be empty for async providers)
                const outputs = node.outputs ?? {};
                // Note: fillInstanceOutputs is no longer called here - provider uses node.setOutputs()
                this.stateMachine.setResourceState(nodeId, 'deployed');
                if (this.stackName) {
                    await this.stateMachine.recordResourceApplied(this.stackName, nodeId, outputs);
                    await this.stateMachine.updateCheckpoint(this.stackName, i);
                }
            }
            // Re-collect nodes - new nodes are already created thanks to synchronous batching
            const newNodes = collectInstanceNodes(this.rootFiber);
            const hasNewNodes = newNodes.some(n => !this.currentNodes.some(p => p.id === n.id));
            if (hasNewNodes) {
                const prevNodes = this.currentNodes;
                this.currentNodes = newNodes;
                await this.applyChanges(prevNodes); // Recurse for new nodes
            }
            else {
                this.currentNodes = newNodes;
                // Complete deployment
                if (this.stackName) {
                    await this.stateMachine.completeDeployment(this.stackName, serializeNodes(this.currentNodes));
                }
            }
        }
        catch (error) {
            // Record failure
            if (this.stackName) {
                await this.stateMachine.failDeployment(this.stackName, error instanceof Error ? error : new Error(String(error)));
            }
            throw error;
        }
    }
    /**
     * Handle provider output change events
     *
     * This is the event-driven part - when provider emits changes,
     * we update signals (triggering synchronous re-renders via batch),
     * and apply any new nodes.
     */
    async handleOutputChange(change) {
        // Find node by resource name (props.name) - constructs use name as cloud resource identifier
        const node = this.currentNodes.find(n => n.props.name === change.resourceName);
        if (!node) {
            console.warn(`[CReact] No node found for resource: ${change.resourceName}`);
            return;
        }
        // Update signal - reactive system triggers component re-execution
        // With synchronous batching, re-renders happen inside fillInstanceOutputs
        fillInstanceOutputs(node.id, change.outputs);
        // Re-collect and apply any new nodes
        if (this.rootFiber) {
            const prevNodes = this.currentNodes;
            this.currentNodes = collectInstanceNodes(this.rootFiber);
            await this.applyChanges(prevNodes);
        }
    }
    /**
     * Get current instance nodes (for debugging/testing)
     */
    getNodes() {
        return [...this.currentNodes];
    }
    /**
     * Get the state machine (for advanced usage)
     */
    getStateMachine() {
        return this.stateMachine;
    }
    /**
     * Stop the runtime
     */
    stop() {
        if (this.instanceProvider.off && this.outputChangeHandler) {
            this.instanceProvider.off('outputsChanged', this.outputChangeHandler);
        }
        if (this.instanceProvider.stop) {
            this.instanceProvider.stop();
        }
    }
    /**
     * Render CloudDOM - main entry point
     *
     * Usage:
     *   CReact.provider = myProvider;
     *   CReact.backend = myBackend;
     *   export default () => renderCloudDOM(<App />, 'my-stack');
     */
    static async renderCloudDOM(element, stackName) {
        if (!CReact.provider) {
            throw new Error('CReact.provider must be set before calling renderCloudDOM');
        }
        if (!CReact.backend) {
            throw new Error('CReact.backend must be set before calling renderCloudDOM');
        }
        const runtime = new CReact(CReact.provider, CReact.backend);
        await runtime.run(element, stackName);
        // Store for CLI/tooling access
        CReact._lastRuntime = runtime;
        CReact._lastStackName = stackName;
        // Return immediately - process stays alive via provider event listeners
        return runtime.getNodes();
    }
    /**
     * Get last runtime instance (for hot reload / CLI tooling)
     * Hot reload uses this to re-render with updated code without full restart
     */
    static getLastRuntime() {
        const runtime = CReact._lastRuntime;
        const stackName = CReact._lastStackName;
        return runtime && stackName ? { runtime, stackName } : null;
    }
}
/**
 * Reset all runtime state (for testing)
 */
export function resetRuntime() {
    clearNodeRegistry();
    clearHydration();
    clearOutputHydration();
    clearContextStacks();
    resetResourcePath();
}
/**
 * Minimal in-memory backend for the convenience run() function
 * @internal
 */
class SimpleInMemoryBackend {
    states = new Map();
    async getState(stackName) {
        const state = this.states.get(stackName);
        return state ? JSON.parse(JSON.stringify(state)) : null;
    }
    async saveState(stackName, state) {
        this.states.set(stackName, JSON.parse(JSON.stringify(state)));
    }
}
/**
 * Convenience function to run once and return nodes (for testing)
 *
 * Creates a runtime with a simple in-memory backend and runs it.
 * Use this for tests where you don't need persistent state.
 */
export async function run(rootElement, provider, previousNodes, options) {
    const backend = new SimpleInMemoryBackend();
    const runtime = new CReact(provider, backend, options);
    await runtime.run(rootElement, previousNodes);
    return runtime.getNodes();
}
/**
 * Run with explicit backend (for production use)
 */
export async function runWithBackend(rootElement, provider, backend, stackName, options) {
    const runtime = new CReact(provider, backend, options);
    await runtime.run(rootElement, stackName);
    return runtime.getNodes();
}
// Convenience export
export const renderCloudDOM = CReact.renderCloudDOM.bind(CReact);
