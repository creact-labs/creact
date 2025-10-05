// REQ-01, REQ-04, REQ-05, REQ-07, REQ-09: CReact orchestrator - main class
// Orchestrates the entire pipeline: render → validate → build → deploy

import { Renderer } from './Renderer';
import { Validator } from './Validator';
import { CloudDOMBuilder } from './CloudDOMBuilder';
import { ICloudProvider } from '../providers/ICloudProvider';
import { IBackendProvider } from '../providers/IBackendProvider';
import { CloudDOMNode, JSXElement } from './types';
import * as fs from 'fs';
import * as path from 'path';

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
 * CReact orchestrator - main class
 * 
 * Orchestrates the entire infrastructure-as-code pipeline:
 * 1. Render JSX → Fiber tree
 * 2. Validate Fiber tree
 * 3. Build CloudDOM from Fiber
 * 4. Persist CloudDOM to disk
 * 5. Compare CloudDOM trees (diff)
 * 6. Deploy CloudDOM to cloud provider
 * 
 * REQ-01: JSX → CloudDOM rendering
 * REQ-04: Dependency injection pattern
 * REQ-05: Deployment orchestration
 * REQ-07: Validation before commit/deploy
 * REQ-09: Provider lifecycle hooks
 */
export class CReact {
  private renderer: Renderer;
  private validator: Validator;
  private cloudDOMBuilder: CloudDOMBuilder;
  // Note: Reconciler will be added in Phase 3 (Task 14)
  
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
    
    // Note: Reconciler will be instantiated here in Phase 3
    // this.reconciler = new Reconciler(config.migrationMap);
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
   * Pipeline: render → validate → build → persist
   * 
   * REQ-01: JSX → CloudDOM rendering
   * REQ-01.6: Persist CloudDOM to disk
   * REQ-07: Validate before commit
   * 
   * @param jsx - JSX element to render
   * @returns Promise resolving to CloudDOM tree
   */
  async build(jsx: JSXElement): Promise<CloudDOMNode[]> {
    this.log('Starting build pipeline');
    
    // Step 1: Render JSX → Fiber
    this.log('Rendering JSX to Fiber tree');
    const fiber = this.renderer.render(jsx);
    
    // Step 2: Validate Fiber (REQ-07)
    this.log('Validating Fiber tree');
    this.validator.validate(fiber);
    
    // Step 3: Build CloudDOM from Fiber (commit phase)
    this.log('Building CloudDOM from Fiber');
    const cloudDOM = await this.cloudDOMBuilder.build(fiber);
    
    // Step 4: Persist CloudDOM to disk will be added in Task 8 (REQ-01.6)
    // TODO: Task 8 - await this.persistCloudDOM(cloudDOM);
    
    this.log('Build pipeline complete');
    return cloudDOM;
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
   * Note: This will be fully implemented in Phase 3 (Task 14) when Reconciler is added
   * 
   * @param previous - Previous CloudDOM tree
   * @param current - Current CloudDOM tree
   * @returns Diff object (placeholder for now)
   */
  async compare(previous: CloudDOMNode[], current: CloudDOMNode[]): Promise<any> {
    // REQ-07.6: Validate before comparing
    const currentFiber = this.renderer.getCurrentFiber();
    if (currentFiber) {
      this.validator.validate(currentFiber);
    }
    
    // TODO: Implement in Phase 3 (Task 14)
    // return this.reconciler.diff(previous, current);
    
    // Placeholder implementation
    console.log('[CReact] compare() - Reconciler not yet implemented (Phase 3)');
    return {
      creates: [],
      updates: [],
      deletes: [],
      moves: []
    };
  }
  
  /**
   * Deploy CloudDOM to cloud provider
   * 
   * Pipeline: validate → check idempotency → lifecycle hooks → materialize → save state
   * 
   * REQ-05: Deployment orchestration
   * REQ-05.4: Idempotent deployment
   * REQ-07.6: Validate before deploying
   * REQ-09: Provider lifecycle hooks
   * 
   * @param cloudDOM - CloudDOM tree to deploy
   * @param stackName - Stack name for state management (default: 'default')
   */
  async deploy(cloudDOM: CloudDOMNode[], stackName: string = 'default'): Promise<void> {
    // REQ-07.6: Validate before deploying
    const currentFiber = this.renderer.getCurrentFiber();
    if (currentFiber) {
      this.validator.validate(currentFiber);
    }
    
    // REQ-05.4: Check for changes (idempotent deployment)
    this.log('Checking for changes (idempotent deployment)');
    const previousState = await this.config.backendProvider.getState(stackName);
    
    if (previousState?.cloudDOM) {
      // TODO: Use Reconciler in Phase 3 to properly diff
      // For now, simple check if CloudDOM is identical
      const hasChanges = JSON.stringify(previousState.cloudDOM) !== JSON.stringify(cloudDOM);
      
      if (!hasChanges) {
        console.log('[CReact] No changes detected. Deployment skipped (idempotent).');
        this.log('CloudDOM is identical to previous state');
        return;
      }
      
      console.log('[CReact] Changes detected, proceeding with deployment...');
      this.log('CloudDOM differs from previous state');
    } else {
      console.log('[CReact] No previous state found, proceeding with initial deployment...');
      this.log('First deployment for this stack');
    }
    
    try {
      // REQ-09.1: Lifecycle hook - preDeploy
      if (this.config.cloudProvider.preDeploy) {
        this.log('Calling preDeploy lifecycle hook');
        await this.config.cloudProvider.preDeploy(cloudDOM);
      }
      
      // Materialize CloudDOM to infrastructure
      this.log('Materializing CloudDOM to infrastructure');
      this.config.cloudProvider.materialize(cloudDOM, null);
      
      // Collect outputs from materialization
      // TODO: In Phase 2 (Task 13), extract outputs from CloudDOM nodes
      this.log('Extracting outputs from CloudDOM');
      const outputs = this.extractOutputs(cloudDOM);
      
      // Save state to backend
      this.log(`Saving state to backend (stack: ${stackName})`);
      await this.config.backendProvider.saveState(stackName, {
        cloudDOM,
        outputs,
        timestamp: new Date().toISOString()
      });
      
      // REQ-09.2: Lifecycle hook - postDeploy
      if (this.config.cloudProvider.postDeploy) {
        this.log('Calling postDeploy lifecycle hook');
        await this.config.cloudProvider.postDeploy(cloudDOM, outputs);
      }
      
      this.log('Deployment complete');
      
    } catch (error) {
      console.error('[CReact] Deployment failed:', error);
      
      // REQ-09.3: Lifecycle hook - onError
      if (this.config.cloudProvider.onError) {
        this.log('Calling onError lifecycle hook');
        await this.config.cloudProvider.onError(error as Error, cloudDOM);
      }
      
      // Save failed state for post-mortem analysis
      try {
        this.log('Saving failed deployment state');
        await this.config.backendProvider.saveState(`${stackName}-failed`, {
          error: (error as Error).message,
          cloudDOM,
          timestamp: new Date().toISOString()
        });
      } catch (saveError) {
        console.error('[CReact] Failed to save error state:', saveError);
      }
      
      // Re-throw error to halt deployment (REQ-09.4)
      throw error;
    }
  }
  
  // TODO: Task 8 - Implement persistCloudDOM() method
  // This will be added in Task 8 (REQ-01.6)
  
  /**
   * Extract outputs from CloudDOM nodes
   * 
   * REQ-02: Extract outputs from useState calls
   * REQ-06: Universal output access
   * 
   * Note: This will be fully implemented in Phase 2 (Task 13)
   * 
   * @param cloudDOM - CloudDOM tree
   * @returns Outputs object
   */
  private extractOutputs(cloudDOM: CloudDOMNode[]): Record<string, any> {
    const outputs: Record<string, any> = {};
    
    const walk = (nodes: CloudDOMNode[]) => {
      for (const node of nodes) {
        // Extract outputs from node
        if (node.outputs) {
          for (const [key, value] of Object.entries(node.outputs)) {
            // Output name format: nodeId.outputKey (REQ-06)
            const outputName = `${node.id}.${key}`;
            outputs[outputName] = value;
          }
        }
        
        // Recursively walk children
        if (node.children && node.children.length > 0) {
          walk(node.children);
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
}
