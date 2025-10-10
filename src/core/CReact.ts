
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

// REQ-01, REQ-04, REQ-05, REQ-07, REQ-09: CReact orchestrator - main class
// Orchestrates the entire pipeline: render → validate → build → deploy

import { Renderer } from './Renderer';
import { Validator } from './Validator';
import { CloudDOMBuilder } from './CloudDOMBuilder';
import { StateMachine } from './StateMachine';
import { Reconciler, hasChanges } from './Reconciler';
import { ICloudProvider } from '../providers/ICloudProvider';
import { IBackendProvider } from '../providers/IBackendProvider';
import {
  CloudDOMNode,
  JSXElement,
  ChangeSet,
  FiberNode,
  ReRenderReason,
  CReactEvents,
} from './types';
import { CloudDOMEventBus } from './EventBus';
import { setPreviousOutputs, setProviderOutputTracker } from '../hooks/useInstance';
import { setStateBindingManager } from '../hooks/useState';
import { setContextDependencyTracker } from '../hooks/useContext';
import { DeploymentError } from './errors';
import { CReact as JSXCReact } from '../jsx';
import { RenderScheduler } from './RenderScheduler';
import { StateBindingManager } from './StateBindingManager';
import { ProviderOutputTracker } from './ProviderOutputTracker';
import { ContextDependencyTracker } from './ContextDependencyTracker';
import { ErrorRecoveryManager } from './ErrorRecoveryManager';
import { StructuralChangeDetector } from './StructuralChangeDetector';
import { LoggerFactory } from '../utils/Logger';

const logger = LoggerFactory.getLogger('runtime');

/**
 * Configuration for CReact orchestrator
 * REQ-04: Dependency injection - providers are injected via config
 */
export interface CReactConfig {
  /** Cloud provider for materialization (injected) */
  cloudProvider: ICloudProvider;

  /** Backend provider for state management (injected) */
  backendProvider: IBackendProvider;

  /** Optional migration map for refactoring (REQ-08) */
  migrationMap?: Record<string, string>;

  /** Async timeout in milliseconds (default: 5 minutes) (REQ-10.5) */
  asyncTimeout?: number;

  /** Optional event hooks for reactive system integration */
  eventHooks?: CReactEvents;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
}

/**
 * CReact orchestrator - main class
 *
 * Orchestrates the entire infrastructure-as-code pipeline:
 * 1. Render JSX → Fiber tree
 * 2. Validate Fiber tree
 * 3. Build CloudDOM from Fiber
 * 4. Compare CloudDOM trees (diff via Reconciler)
 * 5. Deploy CloudDOM via StateMachine
 *
 * REQ-01: JSX → CloudDOM rendering
 * REQ-04: Dependency injection pattern
 * REQ-05: Deployment orchestration via StateMachine
 * REQ-07: Validation before commit/deploy
 * REQ-09: Provider lifecycle hooks
 * REQ-O01: StateMachine handles all state management
 */
export class CReact {
  // Singleton configuration (React-style API)
  static cloudProvider: ICloudProvider;
  static backendProvider: IBackendProvider;
  static retryPolicy?: RetryPolicy;
  static asyncTimeout?: number;
  static migrationMap?: Record<string, string>;

  // Re-export JSX functions for convenience (so users only need one import)
  static createElement = JSXCReact.createElement;
  static Fragment = JSXCReact.Fragment;

  // Global instance for hooks to access
  private static globalInstance: CReact | null = null;

  // CRITICAL: Hydration map must be STATIC (shared across all instances)
  // During hot reload, multiple CReact instances are created, but they all need
  // to share the same hydration data. The hydration is prepared on one instance
  // but useState (via getCReactInstance) accesses another instance.
  private static hydrationMap: Map<string, any[]> = new Map();

  private renderer: Renderer;
  private validator: Validator;
  private cloudDOMBuilder: CloudDOMBuilder;
  private reconciler: Reconciler;
  private stateMachine: StateMachine;
  private lastFiberTree: any = null; // Store the last rendered Fiber tree for effects

  // Reactive system components
  private renderScheduler: RenderScheduler;
  private stateBindingManager: StateBindingManager;
  private providerOutputTracker: ProviderOutputTracker;
  private contextDependencyTracker: ContextDependencyTracker;
  private errorRecoveryManager: ErrorRecoveryManager;
  private structuralChangeDetector: StructuralChangeDetector;

  // Reactive deployment tracking
  private hasReactiveChanges: boolean = false;
  private reactiveCloudDOM: CloudDOMNode[] | null = null;
  private preReactiveCloudDOM: CloudDOMNode[] | null = null; // CloudDOM before re-render

  /**
   * Constructor receives all dependencies via config (dependency injection)
   *
   * REQ-04: Providers are injected, not inherited
   *
   * @param config - Configuration with injected providers
   */
  constructor(private config: CReactConfig) {
    // Set global instance for hooks to access
    CReact.globalInstance = this;

    // Instantiate core components
    this.renderer = new Renderer();
    this.validator = new Validator();

    // Inject cloud provider into CloudDOMBuilder (REQ-04)
    this.cloudDOMBuilder = new CloudDOMBuilder(config.cloudProvider);

    // Instantiate Reconciler for diff computation
    this.reconciler = new Reconciler();

    // Instantiate StateMachine for deployment orchestration (REQ-O01)
    this.stateMachine = new StateMachine(config.backendProvider);

    // Initialize reactive system components
    this.renderScheduler = new RenderScheduler(config.eventHooks);
    this.stateBindingManager = new StateBindingManager();
    this.providerOutputTracker = new ProviderOutputTracker(config.eventHooks);
    this.contextDependencyTracker = new ContextDependencyTracker(config.eventHooks);
    this.errorRecoveryManager = new ErrorRecoveryManager(config.eventHooks);
    this.structuralChangeDetector = new StructuralChangeDetector(config.eventHooks);

    // Wire up reactive components
    this.renderer.setRenderScheduler(this.renderScheduler);
    this.renderer.setContextDependencyTracker(this.contextDependencyTracker);
    this.renderer.setStructuralChangeDetector(this.structuralChangeDetector);
    this.cloudDOMBuilder.setReactiveComponents(
      this.stateBindingManager,
      this.providerOutputTracker
    );
    this.contextDependencyTracker.setStateBindingManager(this.stateBindingManager);

    // Set the context dependency tracker in useContext hook
    setContextDependencyTracker(this.contextDependencyTracker);

    // Set the state binding manager in useState hook
    setStateBindingManager(this.stateBindingManager);

    // Set the provider output tracker in useInstance hook
    setProviderOutputTracker(this.providerOutputTracker);

    // Subscribe to provider output change events (event-driven reactivity)
    if (this.config.cloudProvider.on) {
      this.config.cloudProvider.on('outputsChanged', (change) => {
        this.handleProviderOutputChange(change).catch((error) => {
          logger.error('Error handling provider output change:', error);
        });
      });
      logger.debug('Subscribed to provider output change events');
    }
  }

  /**
   * Debug logging helper
   * Logs messages when CREACT_DEBUG environment variable is set
   *
   * @param message - Message to log
   */
  private log(message: string): void {
    logger.debug(message);
  }

  /**
   * Get the global CReact instance for hooks to access
   * @internal
   */
  static getCReactInstance(): CReact | null {
    return CReact.globalInstance;
  }

  /**
   * Schedule a component for re-rendering
   * This is called by hooks when reactive state changes
   *
   * @param fiber - Fiber node to re-render
   * @param reason - Reason for the re-render
   */
  scheduleReRender(fiber: FiberNode, reason: ReRenderReason): void {
    this.log(`Scheduling re-render for ${fiber.path.join('.')} (reason: ${reason})`);
    this.renderScheduler.schedule(fiber, reason);
  }

  /**
   * Handle output change events from provider (event-driven reactivity)
   * Called when provider emits 'outputsChanged' event
   *
   * This enables real-time reactivity without polling:
   * 1. Update ProviderOutputTracker with new outputs
   * 2. Execute useEffect callbacks bound to these outputs
   * 3. Update bound state and enqueue affected fibers for re-render
   *
   * @param change - Output change event from provider
   */
  private async handleProviderOutputChange(
    change: import('../providers/ICloudProvider').OutputChangeEvent
  ): Promise<void> {
    if (!this.lastFiberTree) {
      return; // No fiber tree to update
    }

    logger.debug(`Provider output changed: ${change.nodeId}`, change.outputs);

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
      logger.debug(`Output change affected ${affectedFibers.length} fibers`);

      // Schedule re-renders for affected components
      affectedFibers.forEach((fiber) => {
        this.scheduleReRender(fiber, 'output-update');
      });

      // Note: Actual re-render execution happens in the next deployment cycle
      // or can be triggered immediately via renderScheduler.flushBatch()
    }
  }

  /**
   * Handle context value changes and trigger selective re-renders
   * This is called when a context provider value changes
   *
   * @param contextId - Context identifier
   * @param newValue - New context value
   * @returns Promise resolving to affected fibers that were re-rendered
   */
  async handleContextChange(contextId: symbol, newValue: any): Promise<FiberNode[]> {
    this.log(`Context change detected for context: ${String(contextId)}`);

    try {
      // Update context value and get affected fibers
      const affectedFibers = this.contextDependencyTracker.updateContextValue(contextId, newValue);

      if (affectedFibers.length === 0) {
        this.log('No components affected by context change');
        return [];
      }

      this.log(`Context change affects ${affectedFibers.length} components`);

      // Schedule re-renders for affected components
      affectedFibers.forEach((fiber) => {
        this.scheduleReRender(fiber, 'context-change');
      });

      // Execute the scheduled re-renders
      const updatedFiber = this.renderer.reRenderComponents(affectedFibers, 'context-change');

      // Update the last fiber tree
      this.lastFiberTree = updatedFiber;

      return affectedFibers;
    } catch (error) {
      this.log(`Context change handling failed: ${(error as Error).message}`);

      // Attempt rollback
      const rollbackSuccess = this.contextDependencyTracker.rollbackContextValue(contextId);
      if (rollbackSuccess) {
        this.log('Context value rolled back successfully');
      }

      throw error;
    }
  }

  /**
   * Manual re-render trigger for CLI/testing
   * Re-renders the entire stack or specific components
   *
   * @param stackName - Stack name to re-render (default: 'default')
   * @param targetComponents - Optional specific components to re-render
   * @returns Promise resolving to updated CloudDOM
   */
  async rerender(
    stackName: string = 'default',
    targetComponents?: FiberNode[]
  ): Promise<CloudDOMNode[]> {
    this.log(`Manual re-render triggered for stack: ${stackName}`);

    try {
      // Get current state
      const currentState = await this.stateMachine.getState(stackName);
      if (!currentState?.cloudDOM) {
        throw new Error(`No existing state found for stack: ${stackName}`);
      }

      // If no target components specified, re-render from last fiber tree
      if (!targetComponents && this.lastFiberTree) {
        this.log('Re-rendering entire stack from last fiber tree');

        // Re-render the entire fiber tree
        const updatedFiber = this.renderer.reRenderComponents([this.lastFiberTree], 'manual');
        this.lastFiberTree = updatedFiber;

        // Build updated CloudDOM
        const updatedCloudDOM = await this.cloudDOMBuilder.build(updatedFiber);

        // Sync outputs and trigger any additional re-renders
        await this.cloudDOMBuilder.syncOutputsAndReRender(
          updatedFiber,
          updatedCloudDOM,
          currentState.cloudDOM
        );

        return updatedCloudDOM;
      }

      // Re-render specific components
      if (targetComponents && targetComponents.length > 0) {
        this.log(`Re-rendering ${targetComponents.length} specific components`);

        const updatedFiber = this.renderer.reRenderComponents(targetComponents, 'manual');
        const updatedCloudDOM = await this.cloudDOMBuilder.build(updatedFiber);

        return updatedCloudDOM;
      }

      throw new Error('No components available for re-rendering');
    } catch (error) {
      this.log(`Re-render failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Build CloudDOM from JSX
   *
   * Pipeline: render → validate → build → restore outputs
   *
   * REQ-01: JSX → CloudDOM rendering
   * REQ-07: Validate before commit
   *
   * @param jsx - JSX element to render
   * @param stackName - Stack name for state restoration (default: 'default')
   * @returns Promise resolving to CloudDOM tree
   */
  async build(jsx: JSXElement, stackName: string = 'default'): Promise<CloudDOMNode[]> {
    this.log('Starting build pipeline');

    // Step 1: Load previous state to get outputs (via StateMachine)
    this.log('Loading previous state');
    const previousState = await this.stateMachine.getState(stackName);

    // Step 2: If we have previous state, prepare hydration for useState AND inject outputs for useInstance
    if (previousState?.cloudDOM) {
      // CRITICAL: Prepare hydration BEFORE rendering so useState can restore values
      this.log('Preparing hydration for useState');
      this.prepareHydration(previousState.cloudDOM);

      this.log('Injecting previous outputs into useInstance hook');
      setPreviousOutputs(this.buildOutputsMap(previousState.cloudDOM));
    }

    // Step 3: Render JSX → Fiber (with hydration and outputs available)
    this.log('Rendering JSX to Fiber tree');
    const fiber = this.renderer.render(jsx);

    // Step 4: Store the Fiber tree for post-deployment effects
    this.lastFiberTree = fiber;

    // Step 5: Clear hydration and previous outputs after render
    this.log('Clearing hydration data');
    this.clearHydration();
    setPreviousOutputs(null);

    // Step 6: Validate Fiber (REQ-07)
    this.log('Validating Fiber tree');
    this.validator.validate(fiber);

    // Step 7: Build CloudDOM from Fiber (commit phase)
    this.log('Building CloudDOM from Fiber');
    const cloudDOM = await this.cloudDOMBuilder.build(fiber);

    // Step 8: Detect structural changes if we have previous state
    if (previousState?.cloudDOM) {
      this.log('Detecting structural changes');
      const structuralChanges = this.structuralChangeDetector.detectStructuralChanges(
        previousState.cloudDOM,
        cloudDOM,
        fiber
      );

      if (structuralChanges.length > 0) {
        this.log(`Detected ${structuralChanges.length} structural changes`);

        // Trigger re-renders for affected components
        this.structuralChangeDetector.triggerStructuralReRenders(
          structuralChanges,
          this.renderScheduler
        );

        // Check if deployment plan needs updating
        if (this.structuralChangeDetector.requiresDeploymentPlanUpdate(structuralChanges)) {
          this.log('Structural changes require deployment plan update');
        }
      }
    }

    this.log('Build pipeline complete');
    return cloudDOM;
  }

  /**
   * Build a map of node ID → outputs from previous CloudDOM
   *
   * @param previousCloudDOM - Previous CloudDOM state
   * @returns Map of node ID → outputs
   */
  private buildOutputsMap(previousCloudDOM: CloudDOMNode[]): Map<string, Record<string, any>> {
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

    walk(previousCloudDOM);
    return outputsMap;
  }

  /**
   * Build CloudDOM with error handling for CLI/CI environments
   *
   * Provides a safer entrypoint that handles errors gracefully without
   * crashing the entire process. Useful for CI/CD pipelines.
   *
   * @param jsx - JSX element to render
   * @returns Promise resolving to CloudDOM tree, or empty array on error
   */
  async buildSafe(jsx: JSXElement): Promise<CloudDOMNode[]> {
    try {
      return await this.build(jsx);
    } catch (error) {
      logger.error('Build failed:', error);
      return [];
    }
  }

  /**
   * Compare two CloudDOM trees and return diff
   *
   * REQ-05: Reconciliation and diff
   * REQ-07.6: Validate before comparing
   *
   * @param previous - Previous CloudDOM tree
   * @param current - Current CloudDOM tree
   * @returns ChangeSet with creates, updates, deletes, and deployment order
   */
  async compare(previous: CloudDOMNode[], current: CloudDOMNode[]): Promise<ChangeSet> {
    // REQ-07.6: Validate before comparing
    const currentFiber = this.renderer.getCurrentFiber();
    if (currentFiber) {
      this.validator.validate(currentFiber);
    }

    // Use Reconciler to compute diff
    this.log('Computing diff between previous and current CloudDOM');
    return this.reconciler.reconcile(previous, current);
  }

  /**
   * Get reactive deployment information if changes are pending
   * Returns null if no reactive changes detected
   *
   * This encapsulates the logic for checking reactive changes and computing diffs,
   * keeping separation of concerns between core and CLI layers.
   *
   * @param stackName - Stack name to compute diff against
   * @returns Reactive deployment info with CloudDOM and ChangeSet, or null
   */
  async getReactiveDeploymentInfo(stackName: string): Promise<{
    cloudDOM: CloudDOMNode[];
    changeSet: any;
  } | null> {
    if (!this.hasReactiveChanges || !this.reactiveCloudDOM || !this.preReactiveCloudDOM) {
      return null;
    }

    // Compute diff between pre-reactive and post-reactive CloudDOM
    // This shows what NEW resources were created by the re-render
    const changeSet = this.reconciler.reconcile(this.preReactiveCloudDOM, this.reactiveCloudDOM);

    return {
      cloudDOM: this.reactiveCloudDOM,
      changeSet,
    };
  }

  /**
   * Clear reactive changes flag (called after deployment)
   */
  private clearReactiveChanges(): void {
    this.hasReactiveChanges = false;
    this.reactiveCloudDOM = null;
    this.preReactiveCloudDOM = null;
  }

  /**
   * Deploy CloudDOM to cloud provider using StateMachine
   *
   * Pipeline: validate → compute diff → start deployment → materialize → checkpoint → complete
   *
   * REQ-05: Deployment orchestration via StateMachine
   * REQ-05.4: Idempotent deployment (via Reconciler diff)
   * REQ-07.6: Validate before deploying
   * REQ-09: Provider lifecycle hooks
   * REQ-O01: StateMachine handles all state management
   *
   * @param cloudDOM - CloudDOM tree to deploy
   * @param stackName - Stack name for state management (default: 'default')
   * @param user - User initiating deployment (default: 'system')
   */
  async deploy(
    cloudDOM: CloudDOMNode[],
    stackName: string = 'default',
    user: string = 'system'
  ): Promise<void> {
    // Clear reactive changes flag at start of deployment
    this.clearReactiveChanges();

    // REQ-07.6: Validate before deploying
    const currentFiber = this.renderer.getCurrentFiber();
    if (currentFiber) {
      this.validator.validate(currentFiber);
    }

    // REQ-05.4: Compute diff for idempotent deployment
    this.log('Computing diff for idempotent deployment');
    const previousState = await this.stateMachine.getState(stackName);
    const previousCloudDOM = previousState?.cloudDOM || [];

    const changeSet = this.reconciler.reconcile(previousCloudDOM, cloudDOM);

    // Use single source of truth for checking changes
    if (!hasChanges(changeSet)) {
      this.log('No changes detected. Deployment skipped.');
      this.log('No resources to deploy');
      return;
    }

    this.log(
      `Changes detected: ${changeSet.creates.length} creates, ${changeSet.updates.length} updates, ${changeSet.deletes.length} deletes`
    );
    this.log(`Deployment order: ${changeSet.deploymentOrder.length} resources`);

    try {
      // Start deployment via StateMachine
      this.log('Starting deployment via StateMachine');
      await this.stateMachine.startDeployment(stackName, changeSet, cloudDOM, user);

      // REQ-09.1: Lifecycle hook - preDeploy
      if (this.config.cloudProvider.preDeploy) {
        this.log('Calling preDeploy lifecycle hook');
        await this.config.cloudProvider.preDeploy(cloudDOM);
      }

      // Process deletes first (before creates/updates to avoid conflicts)
      if (changeSet.deletes.length > 0) {
        this.log(`Processing ${changeSet.deletes.length} deletes`);
        for (const deleteNode of changeSet.deletes) {
          this.log(`Deleting resource: ${deleteNode.id}`);

          // Trigger onDestroy event callback for this resource
          await CloudDOMEventBus.triggerEventCallbacks(deleteNode, 'destroy');

          // Note: Actual deletion would be handled by the cloud provider
          // For now, we just trigger the callback
          // TODO: Add actual deletion logic when provider supports it
        }
      }

      // Deploy resources in order with checkpoints
      this.log('Deploying resources with checkpoints');
      for (let i = 0; i < changeSet.deploymentOrder.length; i++) {
        const resourceId = changeSet.deploymentOrder[i];
        this.log(`Deploying resource ${i + 1}/${changeSet.deploymentOrder.length}: ${resourceId}`);

        // Find the resource node
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

        // Trigger onDeploy event callback for this resource
        await CloudDOMEventBus.triggerEventCallbacks(resourceNode, 'deploy');

        // Update checkpoint after successful deployment
        await this.stateMachine.updateCheckpoint(stackName, i);
      }

      // Collect outputs from materialization (REQ-02, REQ-06)
      this.log('Extracting outputs from CloudDOM');
      const outputs = this.extractOutputs(cloudDOM);

      // REQ-09.2: Lifecycle hook - postDeploy
      if (this.config.cloudProvider.postDeploy) {
        this.log('Calling postDeploy lifecycle hook');
        await this.config.cloudProvider.postDeploy(cloudDOM, outputs);
      }

      // Complete deployment via StateMachine
      this.log('Completing deployment via StateMachine');
      await this.stateMachine.completeDeployment(stackName);

      // Note: Previously marked initial build as complete, but now reactive system
      // works throughout the entire lifecycle thanks to improved CloudDOMBuilder

      // Execute post-deployment effects with reactive output synchronization
      this.log('Executing post-deployment effects with reactive sync');
      if (this.lastFiberTree) {
        this.log('Executing post-deployment effects...');

        // Integrate with post-deployment effects and output sync
        const affectedFibers = await this.cloudDOMBuilder.integrateWithPostDeploymentEffects(
          this.lastFiberTree,
          cloudDOM,
          previousCloudDOM
        );

        // REQ-7.1, 7.2, 7.3: Check if outputs actually changed (including undefined → value)
        const hasActualChanges = this.hasActualOutputChanges(previousCloudDOM, cloudDOM);

        // CRITICAL: If state outputs changed but no provider output bindings triggered,
        // we still need to re-render to display updated state in the component
        const needsReRender = hasActualChanges || affectedFibers.length > 0;

        if (needsReRender) {
          // If no fibers were affected by provider outputs, but state changed,
          // re-render the root component to display updated state
          const fibersToReRender =
            affectedFibers.length > 0 ? affectedFibers : [this.lastFiberTree];

          this.log(
            `Triggering re-renders for ${fibersToReRender.length} affected components (${hasActualChanges ? 'output changes detected' : 'state changes detected'})`
          );

          // REQ-7.4, 7.5: Schedule re-renders with proper batching and deduplication
          fibersToReRender.forEach((fiber) => {
            this.scheduleReRender(fiber, 'output-update');
          });

          // CRITICAL: Update previousOutputsMap with current CloudDOM outputs
          // This allows useInstance to access outputs during re-render
          const outputsMap = this.buildOutputsMap(cloudDOM);
          logger.debug('Updating previousOutputsMap for re-render with latest outputs');
          logger.debug(`OutputsMap has ${outputsMap.size} entries:`, Array.from(outputsMap.keys()));
          setPreviousOutputs(outputsMap);

          // Execute the scheduled re-renders
          const updatedFiber = this.renderer.reRenderComponents(fibersToReRender, 'output-update');

          // Build updated CloudDOM from re-rendered components
          const updatedCloudDOM = await this.cloudDOMBuilder.build(updatedFiber);

          // Check if the re-render produced new resources to deploy
          const reactiveChangeSet = this.reconciler.reconcile(cloudDOM, updatedCloudDOM);

          if (hasChanges(reactiveChangeSet)) {
            this.log(
              `Re-render produced new changes: ${reactiveChangeSet.creates.length} creates, ${reactiveChangeSet.updates.length} updates`
            );
            this.log('Reactive changes detected - will need another deployment cycle');

            // Store the CloudDOM BEFORE re-render for diff comparison
            this.preReactiveCloudDOM = JSON.parse(JSON.stringify(cloudDOM));

            // Update the CloudDOM with reactive changes
            cloudDOM.splice(0, cloudDOM.length, ...updatedCloudDOM);

            // Store flag indicating reactive changes need deployment
            this.hasReactiveChanges = true;
            this.reactiveCloudDOM = updatedCloudDOM;

            this.log('Post-deployment effects and reactive sync completed');
            this.log('Deployment complete (reactive changes pending)');
            return;
          } else {
            this.log('Re-render produced no new changes');
            // Update the stored CloudDOM with reactive changes
            cloudDOM.splice(0, cloudDOM.length, ...updatedCloudDOM);
          }
        } else {
          logger.debug(`No output or state changes detected, skipping re-render`);
        }

        // Save the updated CloudDOM state with new outputs
        logger.debug('Saving updated state with new outputs...');
        await this.stateMachine.updateCloudDOM(stackName, cloudDOM);

        this.log('Post-deployment effects and reactive sync completed');
      } else {
        logger.warn('No fiber tree found for effects execution');
      }

      this.log('Deployment complete');
    } catch (error) {
      logger.error('Deployment failed:', error);

      // NEW (Gap 3): Attempt error recovery before failing
      if (this.lastFiberTree) {
        try {
          logger.info('Attempting error recovery...');

          // Create snapshot for potential rollback
          this.errorRecoveryManager.createComponentSnapshot(this.lastFiberTree);

          // Attempt recovery using re-render error handler
          const recoveryResult = await this.errorRecoveryManager.handleReRenderError(
            error as Error,
            [this.lastFiberTree],
            'manual'
          );

          if (recoveryResult.success) {
            logger.info(`Error recovery succeeded: ${recoveryResult.message}`);

            // Recovery succeeded - return partial result instead of throwing
            // This allows deployment to complete with recovered state
            return;
          }

          logger.warn(`Error recovery failed: ${recoveryResult.message}`);
        } catch (recoveryError) {
          logger.error('Error during recovery attempt:', recoveryError);
          // Continue with normal error handling
        }
      }

      // Trigger onError event callbacks for all resources
      await CloudDOMEventBus.triggerEventCallbacksRecursive(cloudDOM, 'error', error as Error);

      // REQ-09.3: Lifecycle hook - onError
      if (this.config.cloudProvider.onError) {
        this.log('Calling onError lifecycle hook');
        await this.config.cloudProvider.onError(error as Error, cloudDOM);
      }

      // Mark deployment as failed via StateMachine
      this.log('Marking deployment as failed via StateMachine');
      const deploymentError =
        error instanceof DeploymentError
          ? error
          : new DeploymentError((error as Error).message, {
              message: (error as Error).message,
              code: 'DEPLOYMENT_FAILED',
              stack: (error as Error).stack,
            });

      await this.stateMachine.failDeployment(stackName, deploymentError);

      // Re-throw error to halt deployment (REQ-09.4)
      throw error;
    }
  }

  // Hydration map is now STATIC (see declaration above with globalInstance)

  /**
   * Load previous state from backend and prepare for hydration
   * This should be called before rendering to restore persisted state
   *
   * @param stackName - Stack name to load state for
   */
  async loadStateForHydration(stackName: string): Promise<void> {
    try {
      const previousState = await this.stateMachine.getState(stackName);

      if (previousState && previousState.cloudDOM) {
        this.prepareHydration(previousState.cloudDOM);
        this.log(`Loaded state for hydration from backend: ${stackName}`);
      } else {
        this.log(`No previous state found for stack: ${stackName}`);
      }
    } catch (error) {
      logger.warn(`Failed to load state for hydration: ${(error as Error).message}`);
      // Continue without hydration - this is not a fatal error
    }
  }

  /**
   * Prepare hydration data from previous CloudDOM
   * This must be called BEFORE rendering to make state available to useState
   *
   * CRITICAL: State outputs belong to the COMPONENT that called useState,
   * not the CloudDOM node. We need to key by component path (parent of node).
   *
   * Example:
   * - Component path: ['web-app-stack']
   * - CloudDOM node paths: ['web-app-stack', 'vpc'], ['web-app-stack', 'database']
   * - All nodes from same component share the same state outputs
   * - Hydration should be keyed by 'web-app-stack', not 'web-app-stack.vpc'
   *
   * @param previousCloudDOM - Previous CloudDOM with persisted state outputs
   * @param clearExisting - Whether to clear existing hydration data (default: false)
   */
  prepareHydration(previousCloudDOM: CloudDOMNode[], clearExisting: boolean = false): void {
    if (clearExisting) {
      CReact.hydrationMap.clear();
    }

    if (!previousCloudDOM || previousCloudDOM.length === 0) {
      this.log('No previous state to prepare for hydration');
      return;
    }

    // Extract state outputs from previous CloudDOM and build hydration map
    const extractStateOutputs = (nodes: CloudDOMNode[]) => {
      for (const node of nodes) {
        // CRITICAL FIX: Extract component path (parent of CloudDOM node)
        // node.path = ['web-app-stack', 'vpc']
        // componentPath = 'web-app-stack' (where useState was called)
        const componentPath =
          node.path.length > 1
            ? node.path.slice(0, -1).join('.') // Normal case: parent component
            : node.path.join('.'); // Edge case: root node

        // Validate path
        if (!componentPath) {
          logger.warn(`Invalid component path for hydration:`, node.path);
          continue;
        }

        // Read from state field instead of filtering state.* from outputs
        if (node.state && Object.keys(node.state).length > 0) {
          // Convert state object to array: { state1: "a", state2: "b" } → ["a", "b"]
          // Ensure keys are sorted (state1, state2, state3...) before converting to array
          const stateValues = Object.keys(node.state)
            .sort() // Sort to ensure state1, state2, state3... order
            .map((key) => node.state![key]);

          if (stateValues.length > 0) {
            // Only set if not already set (first node from component wins)
            if (!CReact.hydrationMap.has(componentPath)) {
              CReact.hydrationMap.set(componentPath, stateValues);
              logger.debug(
                `Prepared hydration for component "${componentPath}" (from node "${node.path.join('.')}"): ${JSON.stringify(stateValues)}`
              );
            } else {
              logger.debug(
                `Skipping duplicate hydration for component "${componentPath}" (already set from another node)`
              );
            }
          }
        }

        if (node.children && node.children.length > 0) {
          extractStateOutputs(node.children);
        }
      }
    };

    extractStateOutputs(previousCloudDOM);

    logger.debug(`Hydration prepared: ${CReact.hydrationMap.size} components with state`);
    logger.debug(`Hydration map keys:`, Array.from(CReact.hydrationMap.keys()));
    logger.debug(`This instance is global: ${this === CReact.globalInstance}`);
    logger.debug(`Full hydration map:`, Object.fromEntries(CReact.hydrationMap));
  }

  /**
   * Get hydrated value for a specific fiber and hook index
   * Called by useState during render to check for persisted state
   *
   * @param fiberPath - Path of the fiber
   * @param hookIndex - Index of the hook
   * @returns Hydrated value or undefined if not found
   */
  getHydratedValue(fiberPath: string, hookIndex: number): any {
    const values = CReact.hydrationMap.get(fiberPath);
    if (values && hookIndex < values.length) {
      return values[hookIndex];
    }
    return undefined;
  }

  /**
   * Get hydrated value for a component by searching for any child node
   * This handles the case where useState is in a parent component but state
   * outputs are stored on child CloudDOM nodes
   *
   * With the path mapping fix, this should now find exact matches.
   * The child node search is kept as a fallback for edge cases.
   *
   * @param componentPath - Path of the component (e.g., 'web-app-stack')
   * @param hookIndex - Index of the hook
   * @returns Hydrated value or undefined if not found
   */
  getHydratedValueForComponent(componentPath: string, hookIndex: number): any {
    logger.debug(`getHydratedValueForComponent: path="${componentPath}", hookIndex=${hookIndex}`);
    logger.debug(`Available hydration keys:`, Array.from(CReact.hydrationMap.keys()));

    // Try exact match first (should work now with path mapping fix)
    const exactMatch = this.getHydratedValue(componentPath, hookIndex);
    if (exactMatch !== undefined) {
      logger.debug(`✅ Found exact match for "${componentPath}"[${hookIndex}]:`, exactMatch);
      return exactMatch;
    }

    // Fallback: Search for any child node that starts with this component path
    // This handles edge cases where path mapping might not work as expected
    for (const [nodePath, values] of CReact.hydrationMap.entries()) {
      if (nodePath.startsWith(componentPath + '.') && hookIndex < values.length) {
        logger.debug(
          `✅ Found hydration in child node: ${nodePath} for component: ${componentPath}`
        );
        return values[hookIndex];
      }
    }

    // No match found
    logger.debug(`❌ No hydration found for "${componentPath}"[${hookIndex}]`);

    return undefined;
  }

  /**
   * Check if hydration data is available
   *
   * @returns True if hydration map has data
   */
  hasHydrationData(): boolean {
    const hasData = CReact.hydrationMap.size > 0;
    logger.debug(
      `hasHydrationData: size=${CReact.hydrationMap.size}, hasData=${hasData}, instance=${this === CReact.globalInstance ? 'GLOBAL' : 'OTHER'}`
    );
    return hasData;
  }

  /**
   * Get hydration map keys for debugging
   *
   * @returns Array of component paths with hydration data
   */
  getHydrationMapKeys(): string[] {
    return Array.from(CReact.hydrationMap.keys());
  }

  /**
   * Clear hydration data after rendering is complete
   */
  clearHydration(): void {
    logger.debug(`clearHydration: Clearing ${CReact.hydrationMap.size} entries`);
    logger.debug('clearHydration: Stack trace:', new Error().stack);
    CReact.hydrationMap.clear();
    this.log('Hydration data cleared');
  }

  /**
   * Serialize internal reactive state for hot reload preservation
   * This captures the state of reactive systems that need to survive recompilation
   *
   * @returns Serialized state object
   */
  serializeReactiveState(): any {
    try {
      const state: any = {
        timestamp: Date.now(),
      };

      // Note: Most reactive state is already persisted in CloudDOM outputs
      // This is mainly for tracking metadata and failure statistics

      if (this.renderScheduler) {
        // Preserve failure statistics but not pending renders
        state.renderSchedulerStats = {
          // Add any failure stats if the scheduler tracks them
        };
      }

      return state;
    } catch (error) {
      logger.warn('Failed to serialize reactive state:', error);
      return null;
    }
  }

  /**
   * Restore internal reactive state after hot reload recompilation
   * This restores the state of reactive systems from serialized data
   *
   * @param serializedState - Previously serialized state
   */
  restoreReactiveState(serializedState: any): void {
    if (!serializedState) {
      this.log('No serialized state to restore');
      return;
    }

    try {
      // Clear any pending renders from the previous session
      if (this.renderScheduler && (this.renderScheduler as any).clearPending) {
        (this.renderScheduler as any).clearPending();
      }

      this.log('Reactive state restored from hot reload');
    } catch (error) {
      logger.warn('Failed to restore reactive state:', error);
    }
  }

  /**
   * Hydrate the current fiber tree with state values from previous CloudDOM
   * This is used during hot reload to restore persisted state values
   *
   * @param previousCloudDOM - Previous CloudDOM with persisted state outputs
   */
  hydrateStateFromPreviousCloudDOM(previousCloudDOM: CloudDOMNode[]): void {
    if (!this.lastFiberTree || !previousCloudDOM || previousCloudDOM.length === 0) {
      this.log('No previous state to hydrate');
      return;
    }

    // Extract state outputs from previous CloudDOM
    const stateOutputs = new Map<string, any[]>();

    const extractStateOutputs = (nodes: CloudDOMNode[]) => {
      for (const node of nodes) {
        // Read from state field instead of filtering state.* from outputs
        if (node.state && Object.keys(node.state).length > 0) {
          // Convert state object to array: { state1: "a", state2: "b" } → ["a", "b"]
          // Ensure keys are sorted (state1, state2, state3...) before converting to array
          const stateValues = Object.keys(node.state)
            .sort() // Sort to ensure state1, state2, state3... order
            .map((key) => node.state![key]);

          if (stateValues.length > 0) {
            stateOutputs.set(node.id, stateValues);
          }
        }
        if (node.children && node.children.length > 0) {
          extractStateOutputs(node.children);
        }
      }
    };

    extractStateOutputs(previousCloudDOM);

    if (stateOutputs.size === 0) {
      this.log('No state outputs found in previous CloudDOM');
      return;
    }

    // Hydrate fiber tree with state values
    const hydrateFiber = (fiber: FiberNode) => {
      // Match fiber to CloudDOM node by path
      if ((fiber as any).cloudDOMNodes && Array.isArray((fiber as any).cloudDOMNodes)) {
        for (const node of (fiber as any).cloudDOMNodes) {
          const savedState = stateOutputs.get(node.id);
          if (savedState && savedState.length > 0) {
            // Initialize hooks array if not present
            if (!fiber.hooks) {
              fiber.hooks = [];
            }
            // Restore state values
            for (let i = 0; i < savedState.length; i++) {
              fiber.hooks[i] = savedState[i];
            }
            this.log(`Hydrated ${savedState.length} state values for ${node.id}`);
          }
        }
      }

      // Recursively hydrate children
      if (fiber.children && fiber.children.length > 0) {
        for (const child of fiber.children) {
          hydrateFiber(child);
        }
      }
    };

    hydrateFiber(this.lastFiberTree);

    this.log(`State hydration complete: ${stateOutputs.size} nodes hydrated`);
  }

  /**
   * Check if outputs actually changed between previous and current CloudDOM
   * REQ-7.1, 7.2, 7.3: Proper output change detection including undefined → value transitions
   *
   * @param previous - Previous CloudDOM state
   * @param current - Current CloudDOM state
   * @returns True if any outputs actually changed
   */
  private hasActualOutputChanges(previous: CloudDOMNode[], current: CloudDOMNode[]): boolean {
    // Build maps for efficient comparison
    const previousMap = new Map<string, Record<string, any>>();
    const currentMap = new Map<string, Record<string, any>>();

    const buildMap = (nodes: CloudDOMNode[], map: Map<string, Record<string, any>>) => {
      for (const node of nodes) {
        if (node.outputs) {
          map.set(node.id, node.outputs);
        }
        if (node.children && node.children.length > 0) {
          buildMap(node.children, map);
        }
      }
    };

    buildMap(previous, previousMap);
    buildMap(current, currentMap);

    // Check for changed outputs in existing nodes
    for (const [nodeId, currentOutputs] of currentMap) {
      const previousOutputs = previousMap.get(nodeId) || {};

      // Check each output key
      for (const [outputKey, currentValue] of Object.entries(currentOutputs)) {
        const previousValue = previousOutputs[outputKey];

        // REQ-7.1, 7.3: undefined → value IS a change (initial deployment scenario)
        if (previousValue !== currentValue) {
          logger.debug(
            `Output changed: ${nodeId}.${outputKey} (${previousValue} → ${currentValue})`
          );
          return true;
        }
      }

      // Check for removed outputs
      for (const outputKey of Object.keys(previousOutputs)) {
        if (!(outputKey in currentOutputs)) {
          logger.debug(`Output removed: ${nodeId}.${outputKey}`);
          return true;
        }
      }
    }

    // Check for new nodes with outputs
    for (const [nodeId, currentOutputs] of currentMap) {
      if (!previousMap.has(nodeId) && Object.keys(currentOutputs).length > 0) {
        logger.debug(`New node with outputs: ${nodeId}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Find a CloudDOM node by ID
   *
   * @param nodes - CloudDOM tree to search
   * @param id - Node ID to find
   * @returns CloudDOM node or undefined if not found
   */
  private findNodeById(nodes: CloudDOMNode[], id: string): CloudDOMNode | undefined {
    for (const node of nodes) {
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
    return undefined;
  }

  /**
   * Extract outputs from CloudDOM nodes
   *
   * Walks the CloudDOM tree and collects all outputs from nodes.
   * Outputs are formatted as nodeId.outputKey (e.g., 'registry.state-0').
   *
   * REQ-02: Extract outputs from useState calls
   * REQ-06: Universal output access
   *
   * @param cloudDOM - CloudDOM tree
   * @returns Outputs object with keys in format nodeId.outputKey
   */
  private extractOutputs(cloudDOM: CloudDOMNode[]): Record<string, any> {
    const outputs: Record<string, any> = {};

    // Safety check
    if (!Array.isArray(cloudDOM)) {
      this.log('Warning: cloudDOM is not an array, returning empty outputs');
      return outputs;
    }

    const walk = (nodes: CloudDOMNode[]) => {
      if (!nodes) {
        return;
      }

      if (!Array.isArray(nodes)) {
        this.log(
          `Warning: nodes is not an array: ${typeof nodes}, value: ${JSON.stringify(nodes)}`
        );
        return;
      }

      for (const node of nodes) {
        if (!node) {
          continue;
        }

        // Extract outputs from node
        if (node.outputs && typeof node.outputs === 'object') {
          for (const [key, value] of Object.entries(node.outputs)) {
            // Output name format: nodeId.outputKey (REQ-06)
            const outputName = `${node.id}.${key}`;
            outputs[outputName] = value;
          }
        }

        // Recursively walk children
        if (node.children) {
          if (Array.isArray(node.children) && node.children.length > 0) {
            walk(node.children);
          }
        }
      }
    };

    walk(cloudDOM);
    return outputs;
  }

  /**
   * Get the cloud provider (for testing/debugging)
   *
   * @returns The injected cloud provider
   */
  getCloudProvider(): ICloudProvider {
    return this.config.cloudProvider;
  }

  /**
   * Get the backend provider (for testing/debugging)
   *
   * @returns The injected backend provider
   */
  getBackendProvider(): IBackendProvider {
    return this.config.backendProvider;
  }

  /**
   * Get the state machine (for testing/debugging)
   *
   * @returns The state machine instance
   */
  getStateMachine(): StateMachine {
    return this.stateMachine;
  }

  /**
   * Get backend state for a stack (for CLI/comparison)
   *
   * @param stackName - Stack name to get state for
   * @returns Promise resolving to backend state or null
   */
  async getBackendState(stackName: string): Promise<any> {
    return this.stateMachine.getState(stackName);
  }

  /**
   * React-style render method (singleton API)
   *
   * Renders JSX to CloudDOM using the singleton configuration.
   * This is the recommended API for entry files.
   *
   * Example:
   * ```typescript
   * // Configure providers
   * CReact.cloudProvider = new AwsCloudProvider();
   * CReact.backendProvider = new S3BackendProvider();
   *
   * // Render app
   * export default CReact.renderCloudDOM(<MyApp />, 'my-stack');
   * ```
   *
   * @param element - JSX element to render
   * @param stackName - Stack name for state management
   * @returns Promise resolving to CloudDOM tree
   * @throws Error if providers are not configured
   */
  static async renderCloudDOM(element: JSXElement, stackName: string): Promise<CloudDOMNode[]> {
    // Validate that providers are configured
    if (!CReact.cloudProvider) {
      throw new Error('CReact.cloudProvider must be set before calling renderCloudDOM.\n\n');
    }

    if (!CReact.backendProvider) {
      throw new Error('CReact.backendProvider must be set before calling renderCloudDOM.\n\n');
    }

    // Create instance with singleton configuration
    const instance = new CReact({
      cloudProvider: CReact.cloudProvider,
      backendProvider: CReact.backendProvider,
      migrationMap: CReact.migrationMap,
      asyncTimeout: CReact.asyncTimeout,
    });

    // Store the instance globally so CLI can access it
    (CReact as any)._lastInstance = instance;
    (CReact as any)._lastElement = element;
    (CReact as any)._lastStackName = stackName;

    // CRITICAL: Load previous state from backend before rendering
    // This enables useState to hydrate from persisted state
    await instance.loadStateForHydration(stackName);

    // Build and return CloudDOM
    return instance.build(element, stackName);
  }

  /**
   * Get the last instance created by renderCloudDOM (for CLI use)
   * @internal
   */
  static getLastInstance(): { instance: CReact; element: JSXElement; stackName: string } | null {
    if ((CReact as any)._lastInstance) {
      return {
        instance: (CReact as any)._lastInstance,
        element: (CReact as any)._lastElement,
        stackName: (CReact as any)._lastStackName,
      };
    }
    return null;
  }
}

// Export the getCReactInstance function for hooks to use
export const getCReactInstance = CReact.getCReactInstance;
