/**
 * CReact Runtime
 *
 * Event-driven runtime that:
 * 1. Renders JSX -> Fiber tree (components run once)
 * 2. Reconciles and applies changes with dependency ordering
 * 3. Persists state to Memory backend for crash recovery
 * 4. Executes handlers directly
 * 5. When signals change -> effects run -> may create new nodes -> applies new changes
 */

import { clearContextStacks } from "../../src/primitives/context";
import {
  cleanupOwner,
  createRoot,
  getOwner,
  type Owner,
} from "../../src/reactive/owner";
import { setOnFlushCallback } from "../../src/reactive/tracking";
import { clearHydration, prepareHydration } from "../../store/src/store";
import type { Fiber } from "./fiber";
import type { InstanceNode } from "./instance";
import {
  clearNodeOwnership,
  clearNodeRegistry,
  clearOutputHydration,
  getNodeById,
  prepareOutputHydration,
} from "./instance";
import type { Memory } from "./memory";
import { serializeNodes } from "./memory";
import {
  buildDependencyGraph,
  hasChanges,
  reconcile,
  topologicalSort,
} from "./reconcile";
import {
  cleanupFiber,
  collectInstanceNodes,
  renderFiber,
  resetResourcePath,
} from "./render";
import { StateMachine } from "./state-machine";

export interface RenderOptions {
  /** User identifier for audit logs */
  user?: string;
  /** Enable audit logging (requires Memory support) */
  enableAuditLog?: boolean;
}

/**
 * Render result with dispose function
 */
export interface RenderResult {
  /** Dispose of the render tree and stop reactive updates */
  dispose: () => void;
  /** Get current instance nodes */
  getNodes: () => InstanceNode[];
  /** Promise that resolves when initial deployment completes */
  ready: Promise<void>;
}

/**
 * Internal runtime class
 */
class CReactRuntime {
  protected memory: Memory;
  protected stateMachine: StateMachine;
  protected rootFiber: Fiber | null = null;
  protected rootOwner: Owner | null = null;
  protected currentNodes: InstanceNode[] = [];
  protected stackName: string;
  protected disposed = false;

  constructor(memory: Memory, stackName: string, options: RenderOptions = {}) {
    this.memory = memory;
    this.stackName = stackName;

    this.stateMachine = new StateMachine(memory, {
      user: options.user,
      enableAuditLog: options.enableAuditLog,
    });

    setOnFlushCallback(() => this.handleReactiveFlush());
  }

  async run(element: any): Promise<void> {
    if (this.disposed) {
      throw new Error("Cannot run disposed runtime");
    }

    // Check for interrupted deployment
    if (await this.stateMachine.canResume(this.stackName)) {
      await this.stateMachine.getInterruptedNodeId(this.stackName);
    }

    // Load previous state from memory
    let previousNodes: InstanceNode[] = [];
    const prevState = await this.stateMachine.getPreviousState(this.stackName);
    if (prevState) {
      this.stateMachine.restoreResourceStates(prevState.nodes);
      prepareHydration(prevState.nodes as any);
      prepareOutputHydration(prevState.nodes);
      previousNodes = prevState.nodes.filter(
        (n) => n.outputs && Object.keys(n.outputs).length > 0,
      ) as any;
    }

    clearNodeOwnership();

    // Get the current owner from the createRoot in render()
    const currentOwner = getOwner();
    if (currentOwner) {
      this.rootOwner = currentOwner;
    }

    // Render (components run once) - runs inside the createRoot from render()
    this.rootFiber = renderFiber(element, []);
    this.currentNodes = collectInstanceNodes(this.rootFiber);

    // Apply changes (isInitialRun=true to run all handlers)
    await this.applyChanges(previousNodes, true);
  }

  protected async applyChanges(
    previousNodes: InstanceNode[],
    isInitialRun = false,
  ): Promise<void> {
    if (this.disposed) return;

    this.isApplying = true;

    try {
      await this.applyChangesInternal(previousNodes, isInitialRun);
    } finally {
      this.isApplying = false;
    }

    if (this.pendingFlush) {
      this.pendingFlush = false;
      await this.doFlush();
    }
  }

  protected async applyChangesInternal(
    previousNodes: InstanceNode[],
    isInitialRun = false,
  ): Promise<void> {
    const changes = reconcile(previousNodes, this.currentNodes);

    // On initial run, we need to run handlers for ALL nodes to re-establish
    // side effects (intervals, subscriptions, etc.) even if nothing changed.
    // Handlers must be idempotent to support this behavior.
    const unchangedNodes = isInitialRun
      ? this.currentNodes.filter(
          (n) =>
            !changes.creates.some((c) => c.id === n.id) &&
            !changes.updates.some((u) => u.id === n.id),
        )
      : [];

    if (
      changes.creates.length === 0 &&
      changes.updates.length === 0 &&
      changes.deletes.length === 0 &&
      unchangedNodes.length === 0
    ) {
      await this.stateMachine.completeDeployment(
        this.stackName,
        serializeNodes(this.currentNodes),
      );
      return;
    }

    await this.stateMachine.startDeployment(
      this.stackName,
      serializeNodes(this.currentNodes),
      {
        creates: changes.creates.length,
        updates: changes.updates.length,
        deletes: changes.deletes.length,
        resumed: unchangedNodes.length,
      },
    );

    try {
      // Apply deletes (reverse order)
      const deleteIds = changes.deletes.map((n) => n.id);
      const graph = buildDependencyGraph(changes.deletes);
      const deleteOrder = topologicalSort(deleteIds, graph).reverse();

      for (const nodeId of deleteOrder) {
        const node = changes.deletes.find((n) => n.id === nodeId);
        if (node) {
          this.stateMachine.setResourceState(nodeId, "applying");

          if (node.cleanupFn) {
            await node.cleanupFn();
          }

          await this.stateMachine.recordResourceDestroyed(
            this.stackName,
            nodeId,
          );
        }
      }

      // Execute handlers for creates, updates, and resumed (unchanged) nodes
      // Unchanged nodes on initial run need handlers to re-establish side effects
      const allNodesToRun = [
        ...changes.deploymentOrder,
        ...unchangedNodes.map((n) => n.id),
      ];

      for (const nodeId of allNodesToRun) {
        const node = getNodeById(nodeId);
        if (!node) continue;

        this.stateMachine.setResourceState(nodeId, "applying");
        await this.stateMachine.markApplying(this.stackName, nodeId);

        // Handlers must be idempotent - no cleanup needed on updates/resumes.
        // Cleanup only runs on deletes (resource removal).
        const cleanup = await node.handler(node.props, (outputs) =>
          node.setOutputs(outputs),
        );
        if (cleanup) {
          node.cleanupFn = cleanup;
        }

        const outputs = node.outputs ?? {};

        this.stateMachine.setResourceState(nodeId, "deployed");
        await this.stateMachine.clearApplying(this.stackName);
        await this.stateMachine.updateNodeOutputs(
          this.stackName,
          nodeId,
          outputs,
        );
        await this.stateMachine.recordResourceApplied(
          this.stackName,
          nodeId,
          outputs,
        );
      }

      // Re-collect nodes and check for any changes (new, removed, or prop changes)
      const newNodes = collectInstanceNodes(this.rootFiber!);

      if (hasChanges(this.currentNodes, newNodes)) {
        const prevNodes = this.currentNodes;
        this.currentNodes = newNodes;
        await this.applyChangesInternal(prevNodes);
      } else {
        this.currentNodes = newNodes;
        await this.stateMachine.completeDeployment(
          this.stackName,
          serializeNodes(this.currentNodes),
        );
      }
    } catch (error) {
      await this.stateMachine.failDeployment(
        this.stackName,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  protected isApplying = false;
  protected pendingFlush = false;

  protected handleReactiveFlush(): void {
    if (!this.rootFiber || this.disposed) return;

    if (this.isApplying) {
      this.pendingFlush = true;
      return;
    }

    this.doFlush();
  }

  protected async doFlush(): Promise<void> {
    if (!this.rootFiber || this.isApplying || this.disposed) return;

    const newNodes = collectInstanceNodes(this.rootFiber);

    // Check for any changes: new nodes, removed nodes, or prop changes
    if (hasChanges(this.currentNodes, newNodes)) {
      const prevNodes = this.currentNodes;
      this.currentNodes = newNodes;

      try {
        await this.applyChanges(prevNodes);
      } catch (err) {
        console.error(
          "[CReact] Error applying changes after reactive flush:",
          err,
        );
      }

      if (this.pendingFlush) {
        this.pendingFlush = false;
        await this.doFlush();
      }
    } else {
      // No node changes, but outputs may have changed - save state
      this.scheduleSaveState();
    }
  }

  // Debounced state saving for output changes
  protected saveStateTimeout: ReturnType<typeof setTimeout> | null = null;

  protected scheduleSaveState(): void {
    if (this.saveStateTimeout) {
      clearTimeout(this.saveStateTimeout);
    }
    this.saveStateTimeout = setTimeout(() => {
      this.saveStateTimeout = null;
      this.saveStateNow();
    }, 100); // Debounce 100ms
  }

  protected async saveStateNow(): Promise<void> {
    if (this.disposed) return;
    await this.stateMachine.completeDeployment(
      this.stackName,
      serializeNodes(this.currentNodes),
    );
  }

  getNodes(): InstanceNode[] {
    return [...this.currentNodes];
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    setOnFlushCallback(null);

    if (this.saveStateTimeout) {
      clearTimeout(this.saveStateTimeout);
      this.saveStateTimeout = null;
    }

    if (this.rootFiber) {
      cleanupFiber(this.rootFiber);
      this.rootFiber = null;
    }

    if (this.rootOwner) {
      cleanupOwner(this.rootOwner);
      this.rootOwner = null;
    }
  }
}

/**
 * Render a CReact application
 *
 * Entry point for CReact applications. Renders a component tree
 * and returns a handle with dispose function.
 *
 * @param fn - Function returning JSX element (called once)
 * @param memory - Memory backend for state persistence (you provide the implementation)
 * @param stackName - Name for this deployment stack
 * @param options - Optional render options
 *
 * @example
 * ```tsx
 * import { render } from 'creact';
 *
 * const { dispose } = render(
 *   () => <App />,
 *   myMemoryBackend,
 *   'my-stack'
 * );
 *
 * // Later, to clean up:
 * dispose();
 * ```
 */
export function render(
  fn: () => any,
  memory: Memory,
  stackName: string,
  options?: RenderOptions,
): RenderResult {
  const runtime = new CReactRuntime(memory, stackName, options);

  let resolveReady: () => void;
  let rejectReady: (err: Error) => void;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  // Everything runs inside createRoot - this is the reactive boundary
  createRoot(() => {
    const element = fn();

    // Inject stackName as key on root element
    if (element && typeof element === "object" && "type" in element) {
      element.key = stackName;
    }

    runtime
      .run(element)
      .then(() => resolveReady())
      .catch((err) => {
        console.error("[CReact] Render error:", err);
        rejectReady(err instanceof Error ? err : new Error(String(err)));
      });
  });

  return {
    dispose: () => runtime.dispose(),
    getNodes: () => runtime.getNodes(),
    ready,
  };
}

/**
 * Reset all runtime state (for testing)
 */
export function resetRuntime(): void {
  clearNodeRegistry();
  clearHydration();
  clearOutputHydration();
  clearContextStacks();
  resetResourcePath();
}
