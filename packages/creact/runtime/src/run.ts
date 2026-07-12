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
import {
  addFlushCallback,
  removeFlushCallback,
} from "../../src/reactive/tracking";
import { clearHydration, prepareHydration } from "../../store/src/store";
import type { Fiber } from "./fiber";
import type { InstanceNode } from "./instance";
import {
  callAllCleanupFunctions,
  clearNodeOwnership,
  clearNodeRegistry,
  clearOutputHydration,
  getNodeById,
  prepareOutputHydration,
  removeNodeFromRegistry,
} from "./instance";
import type { Memory } from "./memory";
import { serializeNodes } from "./memory";
import {
  buildDependencyGraph,
  getReadyNodes,
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
  /** User identifier for audit logs and lock ownership */
  user?: string;
  /** Enable audit logging (requires Memory support) */
  enableAuditLog?: boolean;
  /** Lock TTL in seconds when the Memory backend supports locking (default 300) */
  lockTtlSeconds?: number;
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
  /** Wait for all async work (handlers, reactive flushes, debounced saves) to complete */
  settled: () => Promise<void>;
}

// Track all active runtimes for resetRuntime() cleanup
const activeRuntimes = new Set<CReactRuntime>();

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
  protected activeFlush: Promise<void> | null = null;
  protected options: RenderOptions;
  protected lockHeld = false;
  protected flushCallback: () => void;

  constructor(memory: Memory, stackName: string, options: RenderOptions = {}) {
    this.memory = memory;
    this.stackName = stackName;
    this.options = options;

    this.stateMachine = new StateMachine(memory, {
      user: options.user,
      enableAuditLog: options.enableAuditLog,
    });

    this.flushCallback = () => this.handleReactiveFlush();
    addFlushCallback(this.flushCallback);
    activeRuntimes.add(this);
  }

  protected initialRunComplete = false;

  async run(element: any): Promise<void> {
    if (this.disposed) {
      throw new Error("Cannot run disposed runtime");
    }
    try {
      await this.runInternal(element);
    } finally {
      this.initialRunComplete = true;
    }
  }

  protected async runInternal(element: any): Promise<void> {
    // Capture the owner from render()'s createRoot NOW — after the first
    // await the synchronous owner context is gone and getOwner() is null
    const currentOwner = getOwner();
    if (currentOwner) {
      this.rootOwner = currentOwner;
    }

    // Concurrent-deploy protection (when the Memory backend supports locking)
    const acquired = await this.stateMachine.acquireLock(
      this.stackName,
      this.options.user ?? "creact-runtime",
      this.options.lockTtlSeconds ?? 300,
    );
    if (!acquired) {
      throw new Error(
        `[CReact] Stack "${this.stackName}" is locked by another deployment`,
      );
    }
    this.lockHeld = true;

    // Check for interrupted deployment
    if (await this.stateMachine.canResume(this.stackName)) {
      const interrupted = await this.stateMachine.getInterruptedNodeIds(
        this.stackName,
      );
      if (interrupted.length > 0) {
        console.warn(
          `[CReact] Resuming interrupted deployment of "${this.stackName}":`,
          `${interrupted.length} node(s) were in-flight and will re-run:`,
          interrupted,
        );
      }
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
      const deleteGraph = buildDependencyGraph(changes.deletes);
      const deleteOrder = topologicalSort(deleteIds, deleteGraph).reverse();

      for (const nodeId of deleteOrder) {
        const node = changes.deletes.find((n) => n.id === nodeId);
        if (node) {
          this.stateMachine.setResourceState(nodeId, "applying");

          // Prefer the live registry node — snapshots may predate the
          // handler run and therefore miss the cleanupFn it returned
          const cleanup = getNodeById(nodeId)?.cleanupFn ?? node.cleanupFn;
          if (cleanup) {
            await cleanup();
          }
          removeNodeFromRegistry(nodeId);

          await this.stateMachine.recordResourceDestroyed(
            this.stackName,
            nodeId,
          );
        }
      }

      // Concurrent executor with eager cascading
      const deployed = new Set<string>();
      const running = new Map<string, Promise<string>>();
      // Nodes whose props changed while their handler was in flight —
      // they must re-run after completion so the handler sees fresh props
      const dirtyWhileRunning = new Set<string>();
      const pending = new Set<string>([
        ...changes.deploymentOrder,
        ...unchangedNodes.map((n) => n.id),
      ]);
      let graph = buildDependencyGraph(this.currentNodes);
      const deferredDeletes: InstanceNode[] = [];
      const MAX_EXECUTIONS = 1_000_000;
      let totalExecutions = 0;

      while (pending.size > 0 || running.size > 0) {
        // 1. Find nodes whose deps are all satisfied
        const ready = getReadyNodes(
          pending,
          new Set(running.keys()),
          graph,
          deployed,
        );

        // 2. Deadlock check
        if (ready.length === 0 && running.size === 0 && pending.size > 0) {
          console.warn(
            "[CReact] Deadlock detected: pending nodes have unsatisfied dependencies:",
            [...pending],
          );
          break;
        }

        // 3. Launch ready nodes
        for (const nodeId of ready) {
          if (totalExecutions >= MAX_EXECUTIONS) {
            throw new Error(
              `[CReact] Max handler executions (${MAX_EXECUTIONS}) exceeded — possible infinite cascade`,
            );
          }
          totalExecutions++;
          pending.delete(nodeId);

          const handlerPromise = (async (): Promise<string> => {
            const node = getNodeById(nodeId);
            if (!node) return nodeId;

            this.stateMachine.setResourceState(nodeId, "applying");
            await this.stateMachine.addApplying(this.stackName, nodeId);

            const cleanup = await node.handler(node.props, (outputs) =>
              node.setOutputs(outputs),
            );
            if (cleanup) {
              node.cleanupFn = cleanup;
            }

            const outputs = node.outputs ?? {};

            this.stateMachine.setResourceState(nodeId, "deployed");
            await this.stateMachine.removeApplying(this.stackName, nodeId);
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

            return nodeId;
          })();

          running.set(nodeId, handlerPromise);
        }

        // If nothing is running (all pending are blocked), break
        if (running.size === 0) break;

        // 4. Wait for any one handler to complete
        let completedId: string;
        try {
          completedId = await Promise.race(running.values());
        } catch (error) {
          // Fail-fast: cancel remaining by awaiting all (let them settle)
          const remaining = [...running.values()];
          await Promise.allSettled(remaining);
          throw error;
        }

        // 5. Move running → deployed (or re-queue if props changed mid-run)
        running.delete(completedId);
        if (dirtyWhileRunning.delete(completedId)) {
          pending.add(completedId);
        } else {
          deployed.add(completedId);
        }

        // 6. Eager cascade: re-collect nodes from fiber tree
        const newNodes = collectInstanceNodes(this.rootFiber!);
        if (hasChanges(this.currentNodes, newNodes)) {
          const cascadeChanges = reconcile(this.currentNodes, newNodes);
          this.currentNodes = newNodes;

          // Add new creates to pending
          for (const node of cascadeChanges.creates) {
            if (!deployed.has(node.id) && !running.has(node.id)) {
              pending.add(node.id);
            }
          }
          // Prop updates must re-run their handler — even for nodes that
          // already deployed this pass (re-queue) or are running (mark dirty)
          for (const node of cascadeChanges.updates) {
            if (running.has(node.id)) {
              dirtyWhileRunning.add(node.id);
            } else {
              deployed.delete(node.id);
              pending.add(node.id);
            }
          }

          // Defer mid-cascade deletes
          deferredDeletes.push(...cascadeChanges.deletes);

          // Rebuild graph with all current nodes
          graph = buildDependencyGraph(this.currentNodes);

          // Keep persisted node list in sync so cascade-born nodes are
          // checkpointable (crash recovery) before completeDeployment
          await this.stateMachine.syncNodes(
            this.stackName,
            serializeNodes(this.currentNodes),
          );
        }
      }

      // Process deferred deletes (reverse topological order)
      if (deferredDeletes.length > 0) {
        const deferredIds = deferredDeletes.map((n) => n.id);
        const deferredGraph = buildDependencyGraph(deferredDeletes);
        const deferredOrder = topologicalSort(
          deferredIds,
          deferredGraph,
        ).reverse();

        for (const nodeId of deferredOrder) {
          const node = deferredDeletes.find((n) => n.id === nodeId);
          if (node) {
            this.stateMachine.setResourceState(nodeId, "applying");
            const cleanup = getNodeById(nodeId)?.cleanupFn ?? node.cleanupFn;
            if (cleanup) {
              await cleanup();
            }
            removeNodeFromRegistry(nodeId);
            await this.stateMachine.recordResourceDestroyed(
              this.stackName,
              nodeId,
            );
          }
        }
      }

      // Safety-net final re-collect
      const finalNodes = collectInstanceNodes(this.rootFiber!);
      if (hasChanges(this.currentNodes, finalNodes)) {
        const prevNodes = this.currentNodes;
        this.currentNodes = finalNodes;
        await this.applyChangesInternal(prevNodes);
      } else {
        this.currentNodes = finalNodes;
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

    const p = this.doFlush().finally(() => {
      if (this.activeFlush === p) this.activeFlush = null;
    });
    this.activeFlush = p;
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

  async settled(): Promise<void> {
    if (this.disposed)
      throw new Error("Cannot call settled() on disposed runtime");
    while (true) {
      if (!this.initialRunComplete) {
        // Initial deployment still in flight (possibly before isApplying is set)
        await new Promise<void>((r) => setTimeout(r, 0));
        continue;
      }
      if (this.activeFlush) {
        await this.activeFlush;
        continue;
      }
      if (this.isApplying || this.pendingFlush) {
        // Yield through the macrotask queue — a microtask spin here would
        // starve timers and hang if an in-flight handler awaits a setTimeout
        await new Promise<void>((r) => setTimeout(r, 0));
        continue;
      }
      if (this.saveStateTimeout) {
        clearTimeout(this.saveStateTimeout);
        this.saveStateTimeout = null;
        await this.saveStateNow();
        continue;
      }
      break;
    }
  }

  getNodes(): InstanceNode[] {
    // Return live nodes with current outputs from the registry
    return this.currentNodes.map(snapshot => {
      const live = getNodeById(snapshot.id);
      if (live) {
        return { ...snapshot, outputs: live.outputs };
      }
      return snapshot;
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    activeRuntimes.delete(this);

    removeFlushCallback(this.flushCallback);

    if (this.lockHeld) {
      this.lockHeld = false;
      void this.stateMachine.releaseLock(this.stackName).catch(() => {
        // best-effort — lock TTL expires it anyway
      });
    }

    if (this.saveStateTimeout) {
      clearTimeout(this.saveStateTimeout);
      this.saveStateTimeout = null;
    }

    // Call cleanup on all current nodes (best-effort, sync)
    // Note: currentNodes are snapshots from collectInstanceNodes, so we must
    // also clear cleanupFn on the real registry node to avoid double-calls.
    for (const node of this.currentNodes) {
      if (node.cleanupFn) {
        const fn = node.cleanupFn;
        node.cleanupFn = undefined;
        const registryNode = getNodeById(node.id);
        if (registryNode) registryNode.cleanupFn = undefined;
        try {
          fn();
        } catch {
          // best-effort
        }
      }
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

  // Everything runs inside createRoot - this is the reactive boundary.
  // The callback takes the dispose arg so createRoot allocates a real owner
  // (a zero-arg callback would reuse the shared UNOWNED sentinel).
  createRoot((_dispose) => {
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
    settled: () => runtime.settled(),
  };
}

/**
 * Reset all runtime state (for testing)
 */
export function resetRuntime(): void {
  // Dispose all active runtimes (aborts cleanupFns, cancels timers)
  for (const runtime of activeRuntimes) {
    runtime.dispose();
  }
  activeRuntimes.clear();

  // Call cleanup on any orphaned nodes in the global registry
  callAllCleanupFunctions();
  clearNodeRegistry();
  clearHydration();
  clearOutputHydration();
  clearContextStacks();
  resetResourcePath();
}
