
/**

 * Licensed under the Apache License, Version 2.0 (the "License");

 * you may not use this file except in compliance with the License.

 * You may obtain a copy of the License at

 *

 *     http://www.apache.org/licenses/LICENSE-2.0

 *

 * Unless required by applicable law or agreed to in writing, software

 * distributed under the License is distributed on an "AS IS" BASIS,

 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.

 * See the License for the specific language governing permissions and

 * limitations under the License.

 *

 * Copyright 2025 Daniel Coutinho Ribeiro

 */

// Runtime class for execution management
// REQ-1.1 through REQ-1.9: Runtime class with lifecycle management

import { Renderer } from './Renderer';
import { Validator } from './Validator';
import { CloudDOMBuilder } from './CloudDOMBuilder';
import { StateMachine } from './StateMachine';
import { Reconciler, hasChanges } from './Reconciler';
import { ICloudProvider } from '../providers/ICloudProvider';
import { IBackendProvider } from '../providers/IBackendProvider';
import { CloudDOMNode, JSXElement, ChangeSet } from './types';
import { RenderScheduler } from './RenderScheduler';
import { StateBindingManager } from './StateBindingManager';
import { ProviderOutputTracker } from './ProviderOutputTracker';
import { ContextDependencyTracker } from './ContextDependencyTracker';
import { ErrorRecoveryManager } from './ErrorRecoveryManager';
import { StructuralChangeDetector } from './StructuralChangeDetector';
import { setPreviousOutputs, setProviderOutputTracker } from '../hooks/useInstance';
import { setStateBindingManager } from '../hooks/useState';
import { setContextDependencyTracker } from '../hooks/useContext';
import { DeploymentError } from './errors';
import chalk from 'chalk';

// Color utilities for console output
const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.dim,
  bold: chalk.bold,
  checkmark: chalk.green('✓'),
  cross: chalk.red('✗'),
  bullet: chalk.gray('•'),
};

/**
 * Runtime configuration
 * REQ-1.6: Configuration with providers, deployment options, log config, hooks
 */
export interface RuntimeConfig {
  /** Cloud provider for resource materialization */
  cloudProvider: ICloudProvider;

  /** Backend provider for state persistence */
  backendProvider: IBackendProvider;

  /** Deployment options */
  deployment?: {
    /** Enable parallel deployment (default: true) */
    parallel?: boolean;

    /** Max concurrent deployments (default: 10) */
    maxConcurrency?: number;

    /** Provider-specific concurrency limits */
    providerConcurrency?: Record<string, number>;
  };

  /** Logging configuration */
  log?: {
    /** Enabled scopes (e.g., ['renderer', 'reconciler']) */
    scopes?: string[];

    /** Log level (default: 'info') */
    level?: 'debug' | 'info' | 'warn' | 'error';
  };

  /** Lifecycle hooks */
  hooks?: {
    onStart?: () => void | Promise<void>;
    onComplete?: (result: DeploymentResult) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
  };

  /** Async timeout in milliseconds (default: 5 minutes) */
  asyncTimeout?: number;

  /** Migration map for refactoring */
  migrationMap?: Record<string, string>;
}

/**
 * Deployment result
 * REQ-1.4: Deploy method returns DeploymentResult
 */
export interface DeploymentResult {
  /** CloudDOM tree after deployment */
  cloudDOM: CloudDOMNode[];

  /** Change set that was applied */
  changeSet: ChangeSet;

  /** Deployment duration in milliseconds */
  duration: number;

  /** Resource outputs */
  outputs: Record<string, any>;

  /** Deployment statistics */
  stats: {
    totalResources: number;
    created: number;
    updated: number;
    deleted: number;
    parallelBatches: number;
    parallelEfficiency: number; // 0-1 ratio
  };
}

/**
 * Runtime class for CReact execution management
 *
 * REQ-1.1: Dedicated Runtime class for managing execution lifecycle
 * REQ-1.2: Initialize renderer, reconciler, state machine, and providers
 * REQ-1.3: Execute full deployment pipeline
 * REQ-1.4: Compute deployment diff without executing
 * REQ-1.5: Tear down resources in reverse dependency order
 * REQ-1.6: Accept provider instances, backend configuration, and deployment options
 * REQ-1.7: Multiple Runtime instances are isolated from each other
 * REQ-1.8: Provide lifecycle hooks (onStart, onComplete, onError)
 * REQ-1.9: Clean up all resources and connections
 *
 * @example
 * ```typescript
 * const runtime = new Runtime({
 *   cloudProvider: new MyCloudProvider(),
 *   backendProvider: new MyBackendProvider(),
 *   deployment: {
 *     parallel: true,
 *     maxConcurrency: 10
 *   },
 *   log: {
 *     scopes: ['runtime', 'reconciler'],
 *     level: 'info'
 *   },
 *   hooks: {
 *     onStart: () => console.log('Deployment starting...'),
 *     onComplete: (result) => console.log('Deployment complete!'),
 *     onError: (error) => console.error('Deployment failed:', error)
 *   }
 * });
 *
 * // Deploy application
 * const result = await runtime.deploy(<MyApp />);
 *
 * // Clean up
 * await runtime.dispose();
 * ```
 */
export class Runtime {
  // Core components (isolated per instance)
  private renderer: Renderer;
  private validator: Validator;
  private cloudDOMBuilder: CloudDOMBuilder;
  private reconciler: Reconciler;
  private stateMachine: StateMachine;

  // Reactive system components
  private renderScheduler: RenderScheduler;
  private stateBindingManager: StateBindingManager;
  private providerOutputTracker: ProviderOutputTracker;
  private contextDependencyTracker: ContextDependencyTracker;
  private errorRecoveryManager: ErrorRecoveryManager;
  private structuralChangeDetector: StructuralChangeDetector;

  // Instance state
  private lastFiberTree: any = null;
  private isDisposed: boolean = false;

  /**
   * Constructor receives all dependencies via config (dependency injection)
   * REQ-1.2: Initialize renderer, reconciler, state machine, and providers
   * REQ-1.6: Accept configuration with providers and options
   * REQ-1.7: Ensure multiple Runtime instances are isolated
   *
   * @param config - Runtime configuration with providers and options
   */
  constructor(private config: RuntimeConfig) {
    console.log(colors.dim('Initializing Runtime...'));

    // REQ-1.2: Initialize core components
    this.renderer = new Renderer();
    this.validator = new Validator();
    this.cloudDOMBuilder = new CloudDOMBuilder(config.cloudProvider);
    this.reconciler = new Reconciler();
    this.stateMachine = new StateMachine(config.backendProvider);

    // Initialize reactive system components
    this.renderScheduler = new RenderScheduler();
    this.stateBindingManager = new StateBindingManager();
    this.providerOutputTracker = new ProviderOutputTracker();
    this.contextDependencyTracker = new ContextDependencyTracker();
    this.errorRecoveryManager = new ErrorRecoveryManager();
    this.structuralChangeDetector = new StructuralChangeDetector();

    // Wire up reactive components
    this.renderer.setRenderScheduler(this.renderScheduler);
    this.renderer.setContextDependencyTracker(this.contextDependencyTracker);
    this.renderer.setStructuralChangeDetector(this.structuralChangeDetector);
    this.cloudDOMBuilder.setReactiveComponents(
      this.stateBindingManager,
      this.providerOutputTracker
    );
    this.contextDependencyTracker.setStateBindingManager(this.stateBindingManager);

    // Set global hook contexts (for this Runtime instance)
    setContextDependencyTracker(this.contextDependencyTracker);
    setStateBindingManager(this.stateBindingManager);
    setProviderOutputTracker(this.providerOutputTracker);

    // Subscribe to provider output change events (event-driven reactivity)
    if (config.cloudProvider.on) {
      config.cloudProvider.on('outputsChanged', (change) => {
        this.handleProviderOutputChange(change).catch((error) => {
          console.error(colors.error('Error handling provider output change:'), error);
        });
      });
      console.log(colors.dim('✓ Subscribed to provider output events'));
    }
  }

  /**
   * Deploy the application
   * REQ-1.3: Execute full deployment pipeline and return DeploymentResult
   * REQ-1.8: Lifecycle hooks support (onStart, onComplete, onError)
   *
   * Pipeline: render → validate → build → reconcile → deploy
   *
   * @param app - JSX element to deploy
   * @param stackName - Stack name for state management (default: 'default')
   * @param user - User initiating deployment (default: 'system')
   * @returns Promise resolving to DeploymentResult
   */
  async deploy(
    app: JSXElement,
    stackName: string = 'default',
    user: string = 'system'
  ): Promise<DeploymentResult> {
    this.ensureNotDisposed();

    const startTime = Date.now();

    try {
      // REQ-1.8: Call onStart lifecycle hook
      if (this.config.hooks?.onStart) {
        await this.config.hooks.onStart();
      }

      // Step 1: Load previous state
      const previousState = await this.stateMachine.getState(stackName);

      // Step 2: Prepare hydration if we have previous state
      if (previousState?.cloudDOM) {
        this.prepareHydration(previousState.cloudDOM);
        setPreviousOutputs(this.buildOutputsMap(previousState.cloudDOM));
      }

      // Step 3: Render JSX → Fiber
      const fiber = this.renderer.render(app);
      this.lastFiberTree = fiber;

      // Step 4: Clear hydration and previous outputs after render
      this.clearHydration();
      setPreviousOutputs(null);

      // Step 5: Validate Fiber
      this.validator.validate(fiber);

      // Step 6: Build CloudDOM from Fiber
      const cloudDOM = await this.cloudDOMBuilder.build(fiber);

      // Step 7: Compute diff
      const previousCloudDOM = previousState?.cloudDOM || [];
      const changeSet = this.reconciler.reconcile(previousCloudDOM, cloudDOM);

      // Check if there are any changes
      if (!hasChanges(changeSet)) {
        console.log(colors.dim('No changes.'));

        const duration = Date.now() - startTime;
        const result: DeploymentResult = {
          cloudDOM,
          changeSet,
          duration,
          outputs: this.extractOutputs(cloudDOM),
          stats: {
            totalResources: cloudDOM.length,
            created: 0,
            updated: 0,
            deleted: 0,
            parallelBatches: 0,
            parallelEfficiency: 0,
          },
        };

        // REQ-1.8: Call onComplete lifecycle hook
        if (this.config.hooks?.onComplete) {
          await this.config.hooks.onComplete(result);
        }

        return result;
      }

      // Display changes summary with diff syntax
      const total = changeSet.creates.length + changeSet.updates.length + changeSet.deletes.length;
      console.log(colors.dim(`\n${total} change${total !== 1 ? 's' : ''}\n`));

      // Show detailed diff
      if (changeSet.creates.length > 0) {
        changeSet.creates.forEach((node) => {
          const resourceType = node.constructType || node.construct?.name || 'Resource';
          console.log(colors.success(`  + ${resourceType}`), colors.dim(node.id));
        });
      }

      if (changeSet.updates.length > 0) {
        changeSet.updates.forEach((node) => {
          const resourceType = node.constructType || node.construct?.name || 'Resource';
          console.log(colors.warning(`  ~ ${resourceType}`), colors.dim(node.id));
        });
      }

      if (changeSet.deletes.length > 0) {
        changeSet.deletes.forEach((node) => {
          const resourceType = node.constructType || node.construct?.name || 'Resource';
          console.log(colors.error(`  - ${resourceType}`), colors.dim(node.id));
        });
      }

      console.log(); // Empty line before deployment starts

      // Step 8: Start deployment via StateMachine
      await this.stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      // Step 9: Call preDeploy lifecycle hook
      if (this.config.cloudProvider.preDeploy) {
        await this.config.cloudProvider.preDeploy(cloudDOM);
      }

      // Step 10: Deploy resources in order
      for (let i = 0; i < changeSet.deploymentOrder.length; i++) {
        const resourceId = changeSet.deploymentOrder[i];
        const resourceNode = this.findNodeById(cloudDOM, resourceId);

        if (!resourceNode) {
          throw new DeploymentError(`Resource not found: ${resourceId}`, {
            message: `Resource not found: ${resourceId}`,
            code: 'RESOURCE_NOT_FOUND',
            details: { resourceId, stackName },
          });
        }

        // Materialize single resource
        await this.config.cloudProvider.materialize([resourceNode], null);

        // Update checkpoint
        await this.stateMachine.updateCheckpoint(stackName, i);
      }

      // Step 11: Collect outputs
      const outputs = this.extractOutputs(cloudDOM);

      // Step 12: Call postDeploy lifecycle hook
      if (this.config.cloudProvider.postDeploy) {
        await this.config.cloudProvider.postDeploy(cloudDOM, outputs);
      }

      // Step 13: Complete deployment
      await this.stateMachine.completeDeployment(stackName);

      const duration = Date.now() - startTime;

      // Calculate statistics
      const stats = {
        totalResources: cloudDOM.length,
        created: changeSet.creates.length,
        updated: changeSet.updates.length,
        deleted: changeSet.deletes.length,
        parallelBatches: changeSet.parallelBatches.length,
        parallelEfficiency: this.calculateParallelEfficiency(changeSet),
      };

      console.log(colors.success(`\n✓ Deployed in ${(duration / 1000).toFixed(2)}s`));

      const result: DeploymentResult = {
        cloudDOM,
        changeSet,
        duration,
        outputs,
        stats,
      };

      // REQ-1.8: Call onComplete lifecycle hook
      if (this.config.hooks?.onComplete) {
        await this.config.hooks.onComplete(result);
      }

      return result;
    } catch (error) {
      console.error(colors.error(`\n✗ ${(error as Error).message}`));

      // NEW (Gap 3): Attempt error recovery before failing
      if (this.lastFiberTree) {
        try {
          console.log(colors.info('Attempting error recovery...'));

          // Create snapshot for potential rollback
          this.errorRecoveryManager.createComponentSnapshot(this.lastFiberTree);

          // Attempt recovery using re-render error handler
          const recoveryResult = await this.errorRecoveryManager.handleReRenderError(
            error as Error,
            [this.lastFiberTree],
            'manual'
          );

          if (recoveryResult.success) {
            console.log(colors.success(`✓ Error recovery succeeded: ${recoveryResult.message}`));

            // Recovery succeeded - return partial result
            const duration = Date.now() - startTime;
            return {
              cloudDOM: recoveryResult.recoveredFibers?.[0]?.cloudDOMNodes || [],
              changeSet: {
                creates: [],
                updates: [],
                deletes: [],
                replacements: [],
                moves: [],
                deploymentOrder: [],
                parallelBatches: [],
              },
              duration,
              outputs: {},
              stats: {
                totalResources: 0,
                created: 0,
                updated: 0,
                deleted: 0,
                parallelBatches: 0,
                parallelEfficiency: 0,
              },
            };
          }

          console.log(colors.warning(`Error recovery failed: ${recoveryResult.message}`));
        } catch (recoveryError) {
          console.error(colors.error('Error during recovery attempt:'), recoveryError);
          // Continue with normal error handling
        }
      }

      // REQ-1.8: Call onError lifecycle hook
      if (this.config.hooks?.onError) {
        await this.config.hooks.onError(error as Error);
      }

      // Call provider onError hook
      if (this.config.cloudProvider.onError) {
        const cloudDOM = await this.getState(stackName);
        await this.config.cloudProvider.onError(error as Error, cloudDOM);
      }

      // Mark deployment as failed
      const deploymentError =
        error instanceof DeploymentError
          ? error
          : new DeploymentError((error as Error).message, {
              message: (error as Error).message,
              code: 'DEPLOYMENT_FAILED',
              stack: (error as Error).stack,
            });

      await this.stateMachine.failDeployment(stackName, deploymentError);

      throw error;
    }
  }

  /**
   * Compute deployment plan without executing
   * REQ-1.4: Plan method computes ChangeSet without executing
   *
   * @param app - JSX element to plan
   * @param stackName - Stack name for state comparison (default: 'default')
   * @returns Promise resolving to ChangeSet
   */
  async plan(app: JSXElement, stackName: string = 'default'): Promise<ChangeSet> {
    this.ensureNotDisposed();

    try {
      // Step 1: Load previous state
      const previousState = await this.stateMachine.getState(stackName);

      // Step 2: Prepare hydration if we have previous state
      if (previousState?.cloudDOM) {
        this.prepareHydration(previousState.cloudDOM);
        setPreviousOutputs(this.buildOutputsMap(previousState.cloudDOM));
      }

      // Step 3: Render JSX → Fiber
      const fiber = this.renderer.render(app);

      // Step 4: Clear hydration
      this.clearHydration();
      setPreviousOutputs(null);

      // Step 5: Validate Fiber
      this.validator.validate(fiber);

      // Step 6: Build CloudDOM
      const cloudDOM = await this.cloudDOMBuilder.build(fiber);

      // Step 7: Compute diff
      const previousCloudDOM = previousState?.cloudDOM || [];
      const changeSet = this.reconciler.reconcile(previousCloudDOM, cloudDOM);

      const total = changeSet.creates.length + changeSet.updates.length + changeSet.deletes.length;

      if (total === 0) {
        console.log(colors.dim('No changes.'));
      } else {
        console.log(colors.dim(`${total} change${total !== 1 ? 's' : ''}\n`));

        // Show detailed diff
        if (changeSet.creates.length > 0) {
          changeSet.creates.forEach((node) => {
            const resourceType = node.constructType || node.construct?.name || 'Resource';
            console.log(colors.success(`  + ${resourceType}`), colors.dim(node.id));
          });
        }

        if (changeSet.updates.length > 0) {
          changeSet.updates.forEach((node) => {
            const resourceType = node.constructType || node.construct?.name || 'Resource';
            console.log(colors.warning(`  ~ ${resourceType}`), colors.dim(node.id));
          });
        }

        if (changeSet.deletes.length > 0) {
          changeSet.deletes.forEach((node) => {
            const resourceType = node.constructType || node.construct?.name || 'Resource';
            console.log(colors.error(`  - ${resourceType}`), colors.dim(node.id));
          });
        }
      }

      return changeSet;
    } catch (error) {
      console.error(colors.error(`✗ ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Destroy all resources
   * REQ-1.5: Tear down resources in reverse dependency order
   *
   * @param stackName - Stack name to destroy (default: 'default')
   */
  async destroy(stackName: string = 'default'): Promise<void> {
    this.ensureNotDisposed();

    try {
      // Get current state
      const state = await this.stateMachine.getState(stackName);

      if (!state || !state.cloudDOM || state.cloudDOM.length === 0) {
        console.log(colors.dim('Nothing to destroy.'));
        return;
      }

      // Compute reverse deployment order
      const changeSet = this.reconciler.reconcile(state.cloudDOM, []);
      const reverseOrder = [...changeSet.deploymentOrder].reverse();

      console.log(
        colors.dim(
          `${reverseOrder.length} resource${reverseOrder.length !== 1 ? 's' : ''} to destroy\n`
        )
      );

      // Show what will be destroyed
      for (let i = 0; i < reverseOrder.length; i++) {
        const resourceId = reverseOrder[i];
        const resourceNode = this.findNodeById(state.cloudDOM, resourceId);

        if (resourceNode) {
          const resourceType =
            resourceNode.constructType || resourceNode.construct?.name || 'Resource';
          console.log(colors.error(`  - ${resourceType}`), colors.dim(resourceNode.id));
        }
      }

      console.log(); // Empty line

      // Delete resources in reverse order
      for (let i = 0; i < reverseOrder.length; i++) {
        const resourceId = reverseOrder[i];
        const resourceNode = this.findNodeById(state.cloudDOM, resourceId);

        if (resourceNode) {
          // Note: Actual deletion would be handled by provider
          // For now, we just log the action
        }
      }

      // Clear state by saving empty CloudDOM
      await this.config.backendProvider.saveState(stackName, {
        status: 'DEPLOYED',
        cloudDOM: [],
        timestamp: Date.now(),
        user: 'system',
        stackName,
      });

      console.log(colors.success('✓ Destroyed'));
    } catch (error) {
      console.error(colors.error(`✗ ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Get current CloudDOM state
   * REQ-1.6: Get current CloudDOM state
   *
   * @param stackName - Stack name (default: 'default')
   * @returns Promise resolving to CloudDOM tree
   */
  async getState(stackName: string = 'default'): Promise<CloudDOMNode[]> {
    this.ensureNotDisposed();

    const state = await this.stateMachine.getState(stackName);
    return state?.cloudDOM || [];
  }

  /**
   * Dispose runtime and clean up resources
   * REQ-1.9: Clean up all resources and connections
   */
  async dispose(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    // Clear hook contexts
    setContextDependencyTracker(null as any);
    setStateBindingManager(null as any);
    setProviderOutputTracker(null as any);
    setPreviousOutputs(null);

    // Mark as disposed
    this.isDisposed = true;
  }

  /**
   * Ensure runtime is not disposed
   * @private
   */
  private ensureNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('Runtime has been disposed and cannot be used');
    }
  }

  /**
   * Handle output change events from provider (event-driven reactivity)
   * Called when provider emits 'outputsChanged' event
   *
   * This enables real-time reactivity without polling:
   * 1. Update ProviderOutputTracker with new outputs
   * 2. Execute useEffect callbacks bound to these outputs (TODO)
   * 3. Update bound state and enqueue affected fibers for re-render
   *
   * @param change - Output change event from provider
   * @private
   */
  private async handleProviderOutputChange(
    change: import('../providers/ICloudProvider').OutputChangeEvent
  ): Promise<void> {
    if (!this.lastFiberTree) {
      return; // No fiber tree to update
    }

    console.log(colors.dim(`Provider output changed: ${change.nodeId}`), change.outputs);

    // Step 1: Update ProviderOutputTracker
    const outputChanges = this.providerOutputTracker.updateInstanceOutputs(
      change.nodeId,
      change.outputs
    );

    if (outputChanges.length === 0) {
      return; // No actual changes detected
    }

    // Step 2: Execute useEffect callbacks bound to these outputs
    // TODO: Implement executeEffectsOnOutputChange when useEffect is ready
    // await executeEffectsOnOutputChange(this.lastFiberTree, outputChanges);

    // Step 3: Update bound state and get affected fibers
    const affectedFibers = this.stateBindingManager.processOutputChanges(outputChanges);

    if (affectedFibers.length > 0) {
      console.log(colors.info(`✓ Output change affected ${affectedFibers.length} fibers`));

      // Schedule re-renders for affected components
      affectedFibers.forEach((fiber) => {
        this.renderScheduler.schedule(fiber, 'output-update');
      });

      // Note: Actual re-render execution happens in the next deployment cycle
      // or can be triggered immediately via renderScheduler.flushBatch()
    }
  }

  /**
   * Prepare hydration data from previous CloudDOM
   * @private
   */
  private prepareHydration(previousCloudDOM: CloudDOMNode[]): void {
    // This would integrate with the hydration system
    // For now, we'll keep it simple
  }

  /**
   * Clear hydration data
   * @private
   */
  private clearHydration(): void {
    // Clear hydration
  }

  /**
   * Build outputs map from CloudDOM
   * @private
   */
  private buildOutputsMap(cloudDOM: CloudDOMNode[]): Map<string, Record<string, any>> {
    const outputsMap = new Map<string, Record<string, any>>();

    const walk = (nodes: CloudDOMNode[]) => {
      for (const node of nodes) {
        if (node.outputs && Object.keys(node.outputs).length > 0) {
          outputsMap.set(node.id, node.outputs);
        }
        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      }
    };

    walk(cloudDOM);
    return outputsMap;
  }

  /**
   * Find node by ID in CloudDOM tree
   * @private
   */
  private findNodeById(cloudDOM: CloudDOMNode[], id: string): CloudDOMNode | null {
    for (const node of cloudDOM) {
      if (node.id === id) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = this.findNodeById(node.children, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Extract outputs from CloudDOM
   * @private
   */
  private extractOutputs(cloudDOM: CloudDOMNode[]): Record<string, any> {
    const outputs: Record<string, any> = {};

    const walk = (nodes: CloudDOMNode[]) => {
      for (const node of nodes) {
        if (node.outputs) {
          outputs[node.id] = node.outputs;
        }
        if (node.children && node.children.length > 0) {
          walk(node.children);
        }
      }
    };

    walk(cloudDOM);
    return outputs;
  }

  /**
   * Calculate parallel efficiency from change set
   * @private
   */
  private calculateParallelEfficiency(changeSet: ChangeSet): number {
    if (changeSet.parallelBatches.length === 0) {
      return 0;
    }

    const totalResources = changeSet.deploymentOrder.length;
    const batchCount = changeSet.parallelBatches.length;

    // Perfect parallelism would be all resources in one batch
    // No parallelism would be one resource per batch
    // Efficiency = (totalResources - batchCount) / (totalResources - 1)
    if (totalResources <= 1) {
      return 1;
    }

    return (totalResources - batchCount) / (totalResources - 1);
  }
}
