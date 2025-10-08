// REQ-01, REQ-04, REQ-05, REQ-07, REQ-09: CReact orchestrator - main class
// Orchestrates the entire pipeline: render → validate → build → deploy

import { Renderer } from './Renderer';
import { Validator } from './Validator';
import { CloudDOMBuilder } from './CloudDOMBuilder';
import { StateMachine } from './StateMachine';
import { Reconciler } from './Reconciler';
import { ICloudProvider } from '../providers/ICloudProvider';
import { IBackendProvider } from '../providers/IBackendProvider';
import { CloudDOMNode, JSXElement, ChangeSet } from './types';
import { setPreviousOutputs } from '../hooks/useInstance';
import { DeploymentError } from './errors';
import { CReact as JSXCReact } from '../jsx';

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

  private renderer: Renderer;
  private validator: Validator;
  private cloudDOMBuilder: CloudDOMBuilder;
  private reconciler: Reconciler;
  private stateMachine: StateMachine;
  private lastFiberTree: any = null; // Store the last rendered Fiber tree for effects

  /**
   * Constructor receives all dependencies via config (dependency injection)
   *
   * REQ-04: Providers are injected, not inherited
   *
   * @param config - Configuration with injected providers
   */
  constructor(private config: CReactConfig) {
    // Instantiate core components
    this.renderer = new Renderer();
    this.validator = new Validator();

    // Inject cloud provider into CloudDOMBuilder (REQ-04)
    this.cloudDOMBuilder = new CloudDOMBuilder(config.cloudProvider);

    // Instantiate Reconciler for diff computation
    this.reconciler = new Reconciler();

    // Instantiate StateMachine for deployment orchestration (REQ-O01)
    this.stateMachine = new StateMachine(config.backendProvider);
  }

  /**
   * Debug logging helper
   * Logs messages when CREACT_DEBUG environment variable is set
   *
   * @param message - Message to log
   */
  private log(message: string): void {
    if (process.env.CREACT_DEBUG === 'true') {
      console.debug(`[CReact] ${message}`);
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

    // Step 2: If we have previous state, inject outputs into useInstance hook
    if (previousState?.cloudDOM) {
      this.log('Injecting previous outputs into useInstance hook');
      setPreviousOutputs(this.buildOutputsMap(previousState.cloudDOM));
    }

    // Step 3: Render JSX → Fiber (with outputs available)
    this.log('Rendering JSX to Fiber tree');
    const fiber = this.renderer.render(jsx);

    // Step 4: Store the Fiber tree for post-deployment effects
    this.lastFiberTree = fiber;

    // Step 5: Clear previous outputs from useInstance hook
    setPreviousOutputs(null);

    // Step 6: Validate Fiber (REQ-07)
    this.log('Validating Fiber tree');
    this.validator.validate(fiber);

    // Step 7: Build CloudDOM from Fiber (commit phase)
    this.log('Building CloudDOM from Fiber');
    const cloudDOM = await this.cloudDOMBuilder.build(fiber);

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
      console.error('[CReact] Build failed:', error);
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

    // Check if there are any changes (creates, updates, deletes, or replacements)
    const hasChanges =
      changeSet.creates.length > 0 ||
      changeSet.updates.length > 0 ||
      changeSet.deletes.length > 0 ||
      changeSet.replacements.length > 0;

    if (!hasChanges) {
      console.log('[CReact] No changes detected. Deployment skipped.');
      this.log('No resources to deploy');
      return;
    }

    console.log(
      `[CReact] Changes detected: ${changeSet.creates.length} creates, ${changeSet.updates.length} updates, ${changeSet.deletes.length} deletes`
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
        this.config.cloudProvider.materialize([resourceNode], null);

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

      // Execute post-deployment effects (useEffect callbacks)
      this.log('Executing post-deployment effects');
      if (this.lastFiberTree) {
        console.log('[CReact] Executing post-deployment effects...');
        await this.cloudDOMBuilder.executePostDeploymentEffects(this.lastFiberTree);
        
        // Sync updated Fiber state back to CloudDOM outputs
        console.log('[CReact] Syncing Fiber state to CloudDOM outputs...');
        this.cloudDOMBuilder.syncFiberStateToCloudDOM(this.lastFiberTree, cloudDOM);
        
        // Save the updated CloudDOM state with new outputs
        console.log('[CReact] Saving updated state with new outputs...');
        await this.stateMachine.updateCloudDOM(stackName, cloudDOM);
        
        console.log('[CReact] Post-deployment effects completed');
      } else {
        console.log('[CReact] No fiber tree found for effects execution');
      }

      console.log('[CReact] Deployment complete');
    } catch (error) {
      console.error('[CReact] Deployment failed:', error);

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
   * Outputs are formatted as nodeId.outputKey (e.g., 'registry.state0').
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
      throw new Error(
        'CReact.cloudProvider must be set before calling renderCloudDOM.\n\n' +
          'Example:\n' +
          '  import { CReact } from \'@escambo/creact\';\n' +
          '  import { AwsCloudProvider } from \'@escambo/creact/providers\';\n\n' +
          '  CReact.cloudProvider = new AwsCloudProvider();\n' +
          '  CReact.backendProvider = new S3BackendProvider();\n\n' +
          '  export default CReact.renderCloudDOM(<App />, \'my-stack\');'
      );
    }

    if (!CReact.backendProvider) {
      throw new Error(
        'CReact.backendProvider must be set before calling renderCloudDOM.\n\n' +
          'Example:\n' +
          '  import { CReact } from \'@escambo/creact\';\n' +
          '  import { S3BackendProvider } from \'@escambo/creact/providers\';\n\n' +
          '  CReact.cloudProvider = new AwsCloudProvider();\n' +
          '  CReact.backendProvider = new S3BackendProvider();\n\n' +
          '  export default CReact.renderCloudDOM(<App />, \'my-stack\');'
      );
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
