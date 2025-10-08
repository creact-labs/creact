import { FiberNode, CloudDOMNode, CReactEvents, ReRenderReason } from './types';
import { generateResourceId } from '../utils/naming';

/**
 * Structural change types for CloudDOM topology changes
 */
export type StructuralChangeType = 
  | 'resource-added'      // New useInstance call appeared
  | 'resource-removed'    // useInstance call disappeared (conditional)
  | 'resource-moved'      // useInstance call moved in hierarchy
  | 'topology-changed';   // Overall tree structure changed

/**
 * Structural change event
 */
export interface StructuralChange {
  type: StructuralChangeType;
  nodeId: string;
  path: string[];
  previousPath?: string[];
  affectedFibers: FiberNode[];
  metadata?: Record<string, any>;
}

/**
 * CloudDOM topology snapshot for comparison
 */
interface TopologySnapshot {
  nodeIds: Set<string>;
  nodePaths: Map<string, string[]>;
  nodeTypes: Map<string, any>;
  hierarchyHash: string;
  timestamp: number;
}

/**
 * StructuralChangeDetector - Detects CloudDOM topology changes
 * 
 * Key Features:
 * - Detect conditional useInstance calls (resources appearing/disappearing)
 * - Track resource hierarchy changes
 * - Trigger re-renders for affected components
 * - Integrate with deployment planning for dynamic updates
 */
export class StructuralChangeDetector {
  private previousSnapshot?: TopologySnapshot;
  private eventHooks?: CReactEvents;

  constructor(eventHooks?: CReactEvents) {
    this.eventHooks = eventHooks;
  }

  /**
   * Detect structural changes between previous and current CloudDOM
   * This is the main method called after each render to detect topology changes
   * 
   * @param previousCloudDOM - Previous CloudDOM state
   * @param currentCloudDOM - Current CloudDOM state
   * @param currentFiber - Current fiber tree for affected component tracking
   * @returns Array of structural changes detected
   */
  detectStructuralChanges(
    previousCloudDOM: CloudDOMNode[],
    currentCloudDOM: CloudDOMNode[],
    currentFiber: FiberNode
  ): StructuralChange[] {
    const changes: StructuralChange[] = [];

    // Create snapshots for comparison
    const previousSnapshot = this.createTopologySnapshot(previousCloudDOM);
    const currentSnapshot = this.createTopologySnapshot(currentCloudDOM);

    // Detect added resources
    const addedChanges = this.detectAddedResources(previousSnapshot, currentSnapshot, currentFiber);
    changes.push(...addedChanges);

    // Detect removed resources
    const removedChanges = this.detectRemovedResources(previousSnapshot, currentSnapshot, currentFiber);
    changes.push(...removedChanges);

    // Detect moved resources
    const movedChanges = this.detectMovedResources(previousSnapshot, currentSnapshot, currentFiber);
    changes.push(...movedChanges);

    // Detect overall topology changes
    if (previousSnapshot.hierarchyHash !== currentSnapshot.hierarchyHash) {
      const topologyChange: StructuralChange = {
        type: 'topology-changed',
        nodeId: 'root',
        path: [],
        affectedFibers: this.findAffectedFibers(currentFiber, changes),
        metadata: {
          previousHash: previousSnapshot.hierarchyHash,
          currentHash: currentSnapshot.hierarchyHash,
          totalChanges: changes.length
        }
      };
      changes.push(topologyChange);
    }

    // Store current snapshot for next comparison
    this.previousSnapshot = currentSnapshot;

    // Emit events for observability
    if (changes.length > 0) {
      this.emitStructuralChangeEvents(changes);
    }

    return changes;
  }

  /**
   * Create a topology snapshot of CloudDOM for comparison
   */
  private createTopologySnapshot(cloudDOM: CloudDOMNode[]): TopologySnapshot {
    const nodeIds = new Set<string>();
    const nodePaths = new Map<string, string[]>();
    const nodeTypes = new Map<string, any>();
    const hierarchyElements: string[] = [];

    const walkNodes = (nodes: CloudDOMNode[], depth: number = 0) => {
      for (const node of nodes) {
        nodeIds.add(node.id);
        nodePaths.set(node.id, [...node.path]);
        nodeTypes.set(node.id, node.construct);
        
        // Add to hierarchy hash elements
        hierarchyElements.push(`${depth}:${node.id}:${node.construct?.name || 'unknown'}`);

        if (node.children && node.children.length > 0) {
          walkNodes(node.children, depth + 1);
        }
      }
    };

    walkNodes(cloudDOM);

    // Create hierarchy hash for quick comparison
    const hierarchyHash = this.generateHash(hierarchyElements.sort().join('|'));

    return {
      nodeIds,
      nodePaths,
      nodeTypes,
      hierarchyHash,
      timestamp: Date.now()
    };
  }

  /**
   * Detect newly added resources (conditional useInstance calls that became active)
   */
  private detectAddedResources(
    previous: TopologySnapshot,
    current: TopologySnapshot,
    fiber: FiberNode
  ): StructuralChange[] {
    const changes: StructuralChange[] = [];

    for (const nodeId of current.nodeIds) {
      if (!previous.nodeIds.has(nodeId)) {
        const path = current.nodePaths.get(nodeId) || [];
        const affectedFibers = this.findFibersForPath(fiber, path);

        changes.push({
          type: 'resource-added',
          nodeId,
          path,
          affectedFibers,
          metadata: {
            construct: current.nodeTypes.get(nodeId)?.name || 'unknown',
            timestamp: Date.now()
          }
        });
      }
    }

    return changes;
  }

  /**
   * Detect removed resources (conditional useInstance calls that became inactive)
   */
  private detectRemovedResources(
    previous: TopologySnapshot,
    current: TopologySnapshot,
    fiber: FiberNode
  ): StructuralChange[] {
    const changes: StructuralChange[] = [];

    for (const nodeId of previous.nodeIds) {
      if (!current.nodeIds.has(nodeId)) {
        const path = previous.nodePaths.get(nodeId) || [];
        const affectedFibers = this.findFibersForPath(fiber, path);

        changes.push({
          type: 'resource-removed',
          nodeId,
          path,
          affectedFibers,
          metadata: {
            construct: previous.nodeTypes.get(nodeId)?.name || 'unknown',
            timestamp: Date.now()
          }
        });
      }
    }

    return changes;
  }

  /**
   * Detect moved resources (useInstance calls that changed hierarchy position)
   */
  private detectMovedResources(
    previous: TopologySnapshot,
    current: TopologySnapshot,
    fiber: FiberNode
  ): StructuralChange[] {
    const changes: StructuralChange[] = [];

    for (const nodeId of current.nodeIds) {
      if (previous.nodeIds.has(nodeId)) {
        const previousPath = previous.nodePaths.get(nodeId);
        const currentPath = current.nodePaths.get(nodeId);

        if (previousPath && currentPath && !this.pathsEqual(previousPath, currentPath)) {
          const affectedFibers = [
            ...this.findFibersForPath(fiber, previousPath),
            ...this.findFibersForPath(fiber, currentPath)
          ];

          changes.push({
            type: 'resource-moved',
            nodeId,
            path: currentPath,
            previousPath,
            affectedFibers,
            metadata: {
              construct: current.nodeTypes.get(nodeId)?.name || 'unknown',
              from: previousPath.join('.'),
              to: currentPath.join('.'),
              timestamp: Date.now()
            }
          });
        }
      }
    }

    return changes;
  }

  /**
   * Find fiber nodes that correspond to a specific path
   */
  private findFibersForPath(fiber: FiberNode, targetPath: string[]): FiberNode[] {
    const matchingFibers: FiberNode[] = [];

    const walkFiber = (currentFiber: FiberNode) => {
      // Check if this fiber's path matches or is a parent of the target path
      if (this.isPathMatch(currentFiber.path, targetPath)) {
        matchingFibers.push(currentFiber);
      }

      // Recursively check children
      if (currentFiber.children && currentFiber.children.length > 0) {
        for (const child of currentFiber.children) {
          walkFiber(child);
        }
      }
    };

    walkFiber(fiber);
    return matchingFibers;
  }

  /**
   * Check if a fiber path matches or is related to a target path
   */
  private isPathMatch(fiberPath: string[], targetPath: string[]): boolean {
    // Exact match
    if (this.pathsEqual(fiberPath, targetPath)) {
      return true;
    }

    // Fiber is parent of target (target path starts with fiber path)
    if (targetPath.length > fiberPath.length) {
      return fiberPath.every((segment, index) => segment === targetPath[index]);
    }

    // Fiber is child of target (fiber path starts with target path)
    if (fiberPath.length > targetPath.length) {
      return targetPath.every((segment, index) => segment === fiberPath[index]);
    }

    return false;
  }

  /**
   * Check if two paths are equal
   */
  private pathsEqual(path1: string[], path2: string[]): boolean {
    if (path1.length !== path2.length) {
      return false;
    }
    return path1.every((segment, index) => segment === path2[index]);
  }

  /**
   * Find all fibers affected by structural changes
   */
  private findAffectedFibers(fiber: FiberNode, changes: StructuralChange[]): FiberNode[] {
    const affectedFibers = new Set<FiberNode>();

    for (const change of changes) {
      change.affectedFibers.forEach(f => affectedFibers.add(f));
    }

    return Array.from(affectedFibers);
  }

  /**
   * Generate a simple hash for hierarchy comparison
   */
  private generateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Emit structural change events for observability
   */
  private emitStructuralChangeEvents(changes: StructuralChange[]): void {
    if (!this.eventHooks) {
      return;
    }

    for (const change of changes) {
      // Emit custom event for structural changes
      if (this.eventHooks.onStructuralChange) {
        (this.eventHooks as any).onStructuralChange(change);
      }

      // Also emit as general events for affected fibers
      for (const fiber of change.affectedFibers) {
        this.eventHooks.onFiberReRenderScheduled?.(fiber, 'structural-change');
      }
    }

    if (process.env.CREACT_DEBUG === 'true') {
      console.debug(`[StructuralChangeDetector] Detected ${changes.length} structural changes:`, changes);
    }
  }

  /**
   * Trigger re-renders for components affected by structural changes
   * This integrates with the RenderScheduler to schedule re-renders
   * 
   * @param changes - Structural changes detected
   * @param renderScheduler - RenderScheduler instance to schedule re-renders
   */
  triggerStructuralReRenders(changes: StructuralChange[], renderScheduler: any): void {
    const affectedFibers = new Set<FiberNode>();

    // Collect all affected fibers
    for (const change of changes) {
      change.affectedFibers.forEach(fiber => affectedFibers.add(fiber));
    }

    // Schedule re-renders for affected fibers
    for (const fiber of affectedFibers) {
      renderScheduler.schedule(fiber, 'structural-change' as ReRenderReason);
    }

    if (process.env.CREACT_DEBUG === 'true') {
      console.debug(`[StructuralChangeDetector] Scheduled re-renders for ${affectedFibers.size} fibers due to structural changes`);
    }
  }

  /**
   * Check if structural changes require deployment plan updates
   * This helps determine if the deployment needs to be re-planned
   * 
   * @param changes - Structural changes detected
   * @returns True if deployment planning should be updated
   */
  requiresDeploymentPlanUpdate(changes: StructuralChange[]): boolean {
    // Any resource addition, removal, or move requires deployment plan update
    return changes.some(change => 
      change.type === 'resource-added' || 
      change.type === 'resource-removed' || 
      change.type === 'resource-moved'
    );
  }

  /**
   * Get statistics about structural changes for monitoring
   */
  getChangeStats(changes: StructuralChange[]): {
    totalChanges: number;
    addedResources: number;
    removedResources: number;
    movedResources: number;
    topologyChanges: number;
    affectedFibers: number;
  } {
    const stats = {
      totalChanges: changes.length,
      addedResources: 0,
      removedResources: 0,
      movedResources: 0,
      topologyChanges: 0,
      affectedFibers: 0
    };

    const allAffectedFibers = new Set<FiberNode>();

    for (const change of changes) {
      switch (change.type) {
        case 'resource-added':
          stats.addedResources++;
          break;
        case 'resource-removed':
          stats.removedResources++;
          break;
        case 'resource-moved':
          stats.movedResources++;
          break;
        case 'topology-changed':
          stats.topologyChanges++;
          break;
      }

      change.affectedFibers.forEach(fiber => allAffectedFibers.add(fiber));
    }

    stats.affectedFibers = allAffectedFibers.size;
    return stats;
  }

  /**
   * Clear previous snapshot (for testing/cleanup)
   */
  clearSnapshot(): void {
    this.previousSnapshot = undefined;
  }
}